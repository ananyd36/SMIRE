import os
from typing import TypedDict

import requests
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from pydantic import BaseModel

from settings import Settings

MAX_SEARCH_ATTEMPTS = 2
MIN_PLACES = 4
MAX_DESCRIBE = 6

llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.3, openai_api_key=os.getenv("OPENAI_API_KEY"))


class Description(BaseModel):
    descriptions: list[str]


class ClinicState(TypedDict):
    lat: float
    lng: float
    zoom: int
    places: list[dict]
    clinics: list[dict]
    attempts: int
    valid: bool


def search_places(state: ClinicState) -> ClinicState:
    ll = f"@{state['lat']},{state['lng']},{state['zoom']}z"
    print(f"Searching Serper Maps for clinics near {ll} (attempt {state['attempts'] + 1}/{MAX_SEARCH_ATTEMPTS})...")
    response = requests.post(
        "https://google.serper.dev/maps",
        headers={"X-API-KEY": Settings.SERPER_API_KEY, "Content-Type": "application/json"},
        json={"q": "clinics hospitals doctors", "ll": ll},
    )
    response.raise_for_status()
    places = response.json().get("places", [])
    print(f"Got {len(places)} places")

    next_zoom = max(state["zoom"] - 3, 8)  # zoom out (widen radius) if we need to retry
    return {**state, "places": places, "zoom": next_zoom, "attempts": state["attempts"] + 1}


def check_places(state: ClinicState) -> ClinicState:
    valid = len(state["places"]) >= MIN_PLACES
    print(f"Check {'passed' if valid else 'failed'}: {len(state['places'])} places (need >= {MIN_PLACES})")
    return {**state, "valid": valid}


def route_after_check(state: ClinicState) -> str:
    if state["valid"] or state["attempts"] >= MAX_SEARCH_ATTEMPTS:
        return "write"
    return "retry"


def write_descriptions(state: ClinicState) -> ClinicState:
    places = state["places"][:MAX_DESCRIBE]
    print(f"Writing descriptions for {len(places)} places...")

    numbered = "\n".join(
        f"{i + 1}. {p.get('title', 'Unknown')} - {p.get('category', p.get('type', 'medical facility'))}, "
        f"rating {p.get('rating', 'n/a')} ({p.get('ratingCount', 0)} reviews)"
        for i, p in enumerate(places)
    )
    prompt = f"""Write one short, friendly, factual one-line description for each
place below, in the same order. Base it only on the facts given — do not
invent details that aren't present. Return exactly {len(places)} descriptions.

{numbered}
"""

    structured_llm = llm.with_structured_output(Description)
    result = structured_llm.invoke(prompt)
    descriptions = result.descriptions

    clinics = []
    for i, place in enumerate(places):
        fallback = f"{place.get('category', place.get('type', 'Medical facility'))} · {place.get('rating', 'N/A')}★ ({place.get('ratingCount', 0)} reviews)"
        clinics.append(
            {
                "Name": place.get("title", "Unknown"),
                "Location": place.get("address", ""),
                "Link": place.get("website", ""),
                "Description": descriptions[i] if i < len(descriptions) else fallback,
            }
        )
    return {**state, "clinics": clinics}


graph = StateGraph(ClinicState)
graph.add_node("search_places", search_places)
graph.add_node("check_places", check_places)
graph.add_node("write_descriptions", write_descriptions)

graph.set_entry_point("search_places")
graph.add_edge("search_places", "check_places")
graph.add_conditional_edges(
    "check_places",
    route_after_check,
    {"write": "write_descriptions", "retry": "search_places"},
)
graph.add_edge("write_descriptions", END)

clinic_graph = graph.compile()


def get_nearby_clinics(lat: float, lng: float) -> list[dict]:
    result = clinic_graph.invoke(
        {"lat": lat, "lng": lng, "zoom": 13, "places": [], "clinics": [], "attempts": 0, "valid": False}
    )
    return result["clinics"]
