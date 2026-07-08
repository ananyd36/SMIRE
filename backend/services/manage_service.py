import os
from typing import TypedDict

import psycopg2
from psycopg2.extras import RealDictCursor
from google import genai
from google.genai import types
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from pinecone import Pinecone, ServerlessSpec
from pydantic import BaseModel

from settings import Settings

MAX_ATTEMPTS = 2
INITIAL_TOP_K = 4
TOP_K_STEP = 4
MAX_HISTORY_TURNS = 6
EMBEDDING_DIMENSION = 768  # text-embedding-004's actual output size

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
INDEX_NAME = "smire"
if INDEX_NAME not in pc.list_indexes().names():
    pc.create_index(
        INDEX_NAME,
        dimension=EMBEDDING_DIMENSION,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
index_main = pc.Index(INDEX_NAME)

llm = ChatGoogleGenerativeAI(
    model="gemini-3-flash-preview", google_api_key=os.getenv("GOOGLE_API_KEY"), temperature=0
)


def generate_embeddings(text: str):
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(
            task_type="SEMANTIC_SIMILARITY", output_dimensionality=EMBEDDING_DIMENSION
        ),
    )
    embeddings = [embedding.values for embedding in result.embeddings]
    return embeddings[0] if len(embeddings) == 1 else embeddings


class GradedChunk(BaseModel):
    index: int
    relevant: bool


class GradingResult(BaseModel):
    grades: list[GradedChunk]


class ManageState(TypedDict):
    user_id: str
    query: str
    top_k: int
    history: list[dict]
    chunks: list[dict]
    graded_chunks: list[dict]
    has_relevant_context: bool
    answer: str
    attempts: int


def load_history(state: ManageState) -> ManageState:
    print(f"Loading conversation history for user {state['user_id']}...")
    conn = psycopg2.connect(Settings.DATABASE_URL, cursor_factory=RealDictCursor)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT query, response FROM conversation_logs WHERE user_id = %s ORDER BY created_at DESC LIMIT %s;",
        (state["user_id"], MAX_HISTORY_TURNS),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    history = list(reversed(rows))
    print(f"Loaded {len(history)} past turns")
    return {**state, "history": history}


def retrieve(state: ManageState) -> ManageState:
    print(
        f"Retrieving chunks for user {state['user_id']} "
        f"(top_k={state['top_k']}, attempt {state['attempts'] + 1}/{MAX_ATTEMPTS})..."
    )
    query_embedding = generate_embeddings(state["query"])
    results = index_main.query(
        vector=query_embedding,
        top_k=state["top_k"],
        namespace="medical_reports",
        include_metadata=True,
        filter={"user_id": {"$eq": state["user_id"]}},
    )
    chunks = [
        {
            "text": match.metadata.get("text", ""),
            "report_name": match.metadata.get("report_name", ""),
            "score": match.score,
        }
        for match in results.matches
    ]
    print(f"Retrieved {len(chunks)} chunks")
    return {**state, "chunks": chunks, "top_k": state["top_k"] + TOP_K_STEP, "attempts": state["attempts"] + 1}


def grade_documents(state: ManageState) -> ManageState:
    if not state["chunks"]:
        print("No chunks to grade")
        return {**state, "graded_chunks": [], "has_relevant_context": False}

    print(f"Grading {len(state['chunks'])} chunks for relevance...")
    numbered = "\n".join(f"{i}. {c['text'][:500]}" for i, c in enumerate(state["chunks"]))
    prompt = f"""A user asked the following question about their medical records:
{state['query']}

Below are {len(state['chunks'])} candidate excerpts retrieved from their
records, numbered 0 to {len(state['chunks']) - 1}. For EACH numbered excerpt,
judge whether it is actually relevant to answering the question (not just
topically similar). You MUST return exactly {len(state['chunks'])} grades,
one for every index listed below, even if most are not relevant.

{numbered}
"""
    structured_llm = llm.with_structured_output(GradingResult)
    result = structured_llm.invoke(prompt)

    graded_chunks = [
        state["chunks"][g.index] for g in result.grades if g.relevant and g.index < len(state["chunks"])
    ]
    print(f"{len(graded_chunks)} of {len(state['chunks'])} chunks judged relevant")
    return {**state, "graded_chunks": graded_chunks, "has_relevant_context": len(graded_chunks) > 0}


def route_after_grading(state: ManageState) -> str:
    if state["has_relevant_context"] or state["attempts"] >= MAX_ATTEMPTS:
        return "generate"
    return "retry"


def generate_answer(state: ManageState) -> ManageState:
    if not state["has_relevant_context"]:
        print("No relevant context found after retries - returning canned response")
        return {
            **state,
            "answer": "The provided context does not contain sufficient information to answer the question.",
        }

    print("Generating answer from graded context...")
    context = "\n".join(c["text"] for c in state["graded_chunks"])
    history_text = "\n".join(f"User: {h['query']}\nAssistant: {h['response']}" for h in state["history"])

    prompt = f"""
    You are an intelligent assistant designed to answer questions strictly based on the extracted context provided. Below is the recent conversation history, the user query and the retrieved context from the database:

    **Recent conversation:**
    {history_text}

    **Query:**
    {state['query']}

    **Context:**
    {context}

    Answer the query concisely and factually based on the provided context. Do not include explanations about the context itself. If the query is about some test or marker like TSH, Haemoglobin, etc. Give some overview of the normal levels and how to keep them regulated.
     Here are some examples: Question: What is the normal range of TSH?,
            Your Answer should be like TSH level for the [individual] are 1.737. \n TSH is a hormone produced by the pituitary gland that regulates the thyroid gland. The normal range for TSH is typically between 0.4 and 4.0 milliunits per liter (mU/L). To maintain healthy TSH levels, it's important to have a balanced diet, manage stress, and get regular exercise. If you have concerns about your TSH levels, consult with a healthcare professional for personalized advice.
            What this example shows is that the answer should be a combination of the context and some general knowledge about the test or marker.
    If the query is about some disease or condition, give a brief overview of the disease and its treatment options. For eg: Question: What is diabetes?
            Your Answer should be like Diabetes is a chronic condition that occurs when the body cannot effectively use insulin, leading to high blood sugar levels. There are two main types: Type 1 diabetes, where the body does not produce insulin, and Type 2 diabetes, where the body does not use insulin properly. Treatment options include lifestyle changes such as diet and exercise, oral medications, and insulin therapy. Regular monitoring of blood sugar levels is essential for managing diabetes.
    If the query is about some medication, give a brief overview of the medication and its uses. For eg: Question: What is Metformin?
            Your Answer should be like Metformin is an oral medication commonly used to treat type 2 diabetes. It helps control blood sugar levels by improving insulin sensitivity and reducing glucose production in the liver. Metformin is often prescribed as part of a comprehensive treatment plan that includes diet and exercise. It may also be used in certain cases of polycystic ovary syndrome (PCOS) and for weight management in individuals with insulin resistance.
       If the context does not contain enough information to fully answer the query, respond only with: "The provided context does not contain sufficient information to answer the question."
    """

    result = llm.invoke(prompt)
    return {**state, "answer": result.content}


def log_conversation(state: ManageState) -> ManageState:
    print("Logging conversation to Postgres...")
    conn = psycopg2.connect(Settings.DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO conversation_logs (user_id, query, response) VALUES (%s, %s, %s);",
        (state["user_id"], state["query"], state["answer"]),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return state


graph = StateGraph(ManageState)
graph.add_node("load_history", load_history)
graph.add_node("retrieve", retrieve)
graph.add_node("grade_documents", grade_documents)
graph.add_node("generate_answer", generate_answer)
graph.add_node("log_conversation", log_conversation)

graph.set_entry_point("load_history")
graph.add_edge("load_history", "retrieve")
graph.add_edge("retrieve", "grade_documents")
graph.add_conditional_edges(
    "grade_documents",
    route_after_grading,
    {"generate": "generate_answer", "retry": "retrieve"},
)
graph.add_edge("generate_answer", "log_conversation")
graph.add_edge("log_conversation", END)

manage_graph = graph.compile()


def get_chat_response(user_id: str, query: str) -> dict:
    result = manage_graph.invoke(
        {
            "user_id": user_id,
            "query": query,
            "top_k": INITIAL_TOP_K,
            "history": [],
            "chunks": [],
            "graded_chunks": [],
            "has_relevant_context": False,
            "answer": "",
            "attempts": 0,
        }
    )
    return {"status": "success", "response": result["answer"]}
