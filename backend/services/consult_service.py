import os
from typing import TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

MAX_HISTORY_TURNS = 6
MAX_ATTEMPTS = 2

llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0, openai_api_key=os.getenv("OPENAI_API_KEY"))


class ConsultState(TypedDict):
    question: str
    history: list[dict]          # raw {query, response} pairs from the client
    windowed_history: list[dict]  # trimmed context actually sent to the LLM
    answer: str
    attempts: int
    valid: bool


def trim_history(state: ConsultState) -> ConsultState:
    windowed = state["history"][-MAX_HISTORY_TURNS:]
    print(f"Trimmed history from {len(state['history'])} to {len(windowed)} turns")
    return {**state, "windowed_history": windowed}


def answer_question(state: ConsultState) -> ConsultState:
    print(f"Answering question (attempt {state['attempts'] + 1}/{MAX_ATTEMPTS})...")

    history_text = "\n".join(
        f"User: {turn['query']}\nAssistant: {turn['response']}" for turn in state["windowed_history"]
    )
    prompt = f"""You are a helpful and precise assistant for answering questions
about medical symptoms and conditions. Here is the recent conversation
history, for context only:
{history_text}

Answer the following question to the best of your ability:
{state['question']}
"""

    result = llm.invoke(prompt)
    answer = result.content
    return {**state, "answer": answer, "attempts": state["attempts"] + 1}


def validate_answer(state: ConsultState) -> ConsultState:
    valid = bool(state["answer"] and state["answer"].strip())
    print(f"Validation {'passed' if valid else 'failed'}")
    return {**state, "valid": valid}


def route_after_validate(state: ConsultState) -> str:
    if state["valid"] or state["attempts"] >= MAX_ATTEMPTS:
        return "end"
    return "retry"


graph = StateGraph(ConsultState)
graph.add_node("trim_history", trim_history)
graph.add_node("answer_question", answer_question)
graph.add_node("validate_answer", validate_answer)

graph.set_entry_point("trim_history")
graph.add_edge("trim_history", "answer_question")
graph.add_edge("answer_question", "validate_answer")
graph.add_conditional_edges(
    "validate_answer",
    route_after_validate,
    {"end": END, "retry": "answer_question"},
)

consult_graph = graph.compile()


def get_consultations(question: str, messages: list) -> str:
    history = [{"query": item.query, "response": item.response} for item in messages]
    result = consult_graph.invoke(
        {"question": question, "history": history, "windowed_history": [], "answer": "", "attempts": 0, "valid": False}
    )
    return result["answer"]
