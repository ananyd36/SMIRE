from crewai import Crew, Task, Agent
from crewai_tools import ScrapeWebsiteTool, SerperDevTool
import json


search_tool = SerperDevTool()
scrape_tool = ScrapeWebsiteTool()


def get_medical_news():
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
        description="Retrieve and summarize at least 6 recent medical and fitness-related news articles.",
        expected_output="A JSON list(with 'Title','Link','Snippet' as keys) of recent medicla news articles.",
        agent = news_reporter_agent,
    )
    news_crew = Crew(
    agents=[news_reporter_agent],
    tasks=[fetch_news_task],
    verbose=True
    )

    result = news_crew.kickoff()

    return result