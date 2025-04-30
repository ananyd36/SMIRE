from fastapi import HTTPException
from google import genai
from google.genai import types
from pinecone import Pinecone, ServerlessSpec
import os



# Initialize Pinecone
api_key = os.getenv('PINECONE_API_KEY')
pc = Pinecone(api_key=api_key)

index_name = 'smire'
index_main = pc.Index(index_name)

def generate_embeddings(text):
    try:
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

        result = client.models.embed_content(
                model="text-embedding-004",
                contents=text,
                config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
)
        embeddings = [embedding.values for embedding in result.embeddings]

        return embeddings[0] if len(embeddings) == 1 else embeddings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating embeddings: {e}")



def complete_gemini(prompt : str):
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    model = "gemini-2.0-flash"

    prompt = prompt.strip()
    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        temperature=0,
        top_p=1,
        top_k=1,
        max_output_tokens=4000,
        response_mime_type="text/plain",
    )

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )
        return response.candidates[0].content.parts[0].text.strip()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing with Gemini: {e}")


def get_chat_response(user_id: str, query: str):
    try:
        contexts = ""
        print(f"Generating embeddings for query: {query}")
        query_embeddings = generate_embeddings(query)

        print("Querying Pinecone for similar vectors...")
        search_results = index_main.query(
            vector=query_embeddings,
            top_k=1,  
            namespace="medical_reports",  
            include_metadata=True 
        )


        # Step 3: Process the results
        if not search_results.matches:
            return {"status": "success", "response": "No relevant data found for your query."}



        print(search_results)
        print("Processing search results...")
        for match in search_results.matches:
            if 'metadata' in match and 'text' in match.metadata:
                contexts += match.metadata['text'] + "\n"



        prompt = f"""
        You are an intelligent assistant designed to answer questions strictly based on the extracted context provided. Below is the user query and the retrieved context from the database:

        **Query:**
        {query}

        **Context:**
        {contexts}

        Answer the query concisely and factually based on the provided context. Do not include explanations about the context itself. If the query is about some test or marker like TSH, Haemoglobin, etc. Give some overview of the normal levels and how to keep them regulated.
         For eg: Question: What is the normal range of TSH?,
                Your Answer should be like TSH level for the [individual] are 1.737. \n TSH is a hormone produced by the pituitary gland that regulates the thyroid gland. The normal range for TSH is typically between 0.4 and 4.0 milliunits per liter (mU/L). To maintain healthy TSH levels, it's important to have a balanced diet, manage stress, and get regular exercise. If you have concerns about your TSH levels, consult with a healthcare professional for personalized advice.
           If the context does not contain enough information to fully answer the query, respond only with: "The provided context does not contain sufficient information to answer the question."
        """

        print("Completing Gemini prompt...")
        response = complete_gemini(prompt)
        print(response)
        return {"status": "success", "response": response if isinstance(response, str) else str(response)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving data: {str(e)}")