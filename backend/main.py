import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from crewai import Crew, Task, Agent, Process
from crewai_tools import ScrapeWebsiteTool, SerperDevTool



app = FastAPI()

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
serper_api_key = os.getenv("SERPER_API_KEY")

os.environ["OPENAI_API_KEY"] = openai_api_key
os.environ["SERPER_API_KEY"] = serper_api_key
os.environ["OPENAI_MODEL_NAME"] = "gpt-3.5-turbo"

# Allow frontend (Next.js) to access the API
origins = [
    "http://localhost:3000",  # Local Next.js frontend
    "http://frontend:3000",   # Docker Compose service name
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE)
    allow_headers=["*"],  # Allow all headers
)

# Initialize the tools
search_tool = SerperDevTool()
scrape_tool = ScrapeWebsiteTool()

@app.get("/")
async def root():
    return {"message": "Backend Running"}


@app.get("/get-news")
async def root():
    news_reporter_agent = Agent(
    role="Medical News and General Health Researcher",
    goal="Analyse the trends and suggest medical news  "
         "to a average adult with tips and suggestions about leading a normal healthy life. Use funny quotes and make it fun.",
    backstory="Specializing in medical news research, this agent "
              "uses internet and health related knowledge articles "
              "to provide crucial insights and news. With a knack for data, "
              "the Medical News and General Health Researche Agent is the cornerstone for "
              "informing medical news.",
    verbose=True,
    allow_delegation=True,
    tools = [scrape_tool, search_tool]
    )

    # Task for news fetching
    fetch_news_task = Task(
        description="Retrieve and summarize at least 4 recent medical and fitness-related news articles.",
        expected_output="A JSON list(with 'Title','Link','Snippet' as keys) of recent medicla news articles.",
        agent = news_reporter_agent,
    )
    news_crew = Crew(
    agents=[news_reporter_agent],
    tasks=[fetch_news_task],
    verbose=True
    )

    result = news_crew.kickoff()
    result_str = str(result) if not isinstance(result, str) else result

    return {"status": "success", "articles": json.loads(result_str)}


@app.get("/api/data")
async def get_data():
    return {"message": "Hello from FastAPI! This is from backend!"}
