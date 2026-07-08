import os
from typing import TypedDict

import requests
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from pydantic import BaseModel

from settings import Settings

MAX_WRITE_ATTEMPTS = 2

llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7, openai_api_key=os.getenv("OPENAI_API_KEY"))


class Article(BaseModel):
    Title: str
    Link: str
    Snippet: str


class ArticleList(BaseModel):
    articles: list[Article]


class NewsState(TypedDict):
    raw_results: list[dict]
    articles: list[dict]
    attempts: int
    valid: bool


def search_news(state: NewsState) -> NewsState:
    print("Searching Serper for recent medical news...")
    response = requests.post(
        "https://google.serper.dev/news",
        headers={"X-API-KEY": Settings.SERPER_API_KEY, "Content-Type": "application/json"},
        json={"q": "medical news health tips", "num": 10},
    )
    response.raise_for_status()
    raw_results = response.json().get("news", [])
    print(f"Got {len(raw_results)} raw results from Serper")
    return {**state, "raw_results": raw_results}


def write_articles(state: NewsState) -> NewsState:
    print(f"Writing articles (attempt {state['attempts'] + 1}/{MAX_WRITE_ATTEMPTS})...")
    structured_llm = llm.with_structured_output(ArticleList)

    prompt = f"""You are a medical news and general health researcher writing for an
average adult reader. Using the search results below, produce a JSON list of
at least 4 articles summarizing recent medical and fitness news. Use funny
quotes and make it fun and encouraging, while staying factually accurate to
the source. Keep each Link exactly as given in the search results.

Search results:
{state['raw_results']}
"""

    result = structured_llm.invoke(prompt)
    articles = [a.model_dump() for a in result.articles]
    return {**state, "articles": articles, "attempts": state["attempts"] + 1}


def validate_articles(state: NewsState) -> NewsState:
    articles = state["articles"]
    valid = len(articles) >= 4 and all(a["Title"] and a["Link"] for a in articles)
    print(f"Validation {'passed' if valid else 'failed'}: {len(articles)} articles")
    return {**state, "valid": valid}


def route_after_validate(state: NewsState) -> str:
    if state["valid"] or state["attempts"] >= MAX_WRITE_ATTEMPTS:
        return "end"
    return "retry"


graph = StateGraph(NewsState)
graph.add_node("search_news", search_news)
graph.add_node("write_articles", write_articles)
graph.add_node("validate_articles", validate_articles)

graph.set_entry_point("search_news")
graph.add_edge("search_news", "write_articles")
graph.add_edge("write_articles", "validate_articles")
graph.add_conditional_edges(
    "validate_articles",
    route_after_validate,
    {"end": END, "retry": "write_articles"},
)

news_graph = graph.compile()


def get_medical_news() -> list[dict]:
    result = news_graph.invoke(
        {"raw_results": [], "articles": [], "attempts": 0, "valid": False}
    )
    return result["articles"]
