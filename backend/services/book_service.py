from crewai import Crew, Task, Agent
from crewai_tools import ScrapeWebsiteTool, SerperDevTool
from fastapi import Query



search_tool = SerperDevTool()
scrape_tool = ScrapeWebsiteTool()





def get_doctors(lat: float = Query(...), lng: float = Query(...)):
    doctor_search_agent = Agent(
    role="Expert in Doctor Search",
    goal="Find nearby medical professionals with high ratings and decent reviews.Use {lattitude} lattitude and {longitude} longitude to base your reference point"
         "General Practitioners (GPs), Dentists, Pediatricians, Dermatologists, Gynecologists can be some of the fields to search for",
    backstory="Specializing in medical professionals research, this agent "
              "uses internet and health related knowledge articles/blogs/websites "
              "to provide a list of medical professionals near the user. With a knack for data, "
              "the Medical Professional search Agent is the cornerstone for "
              "searching top medical professionals.",
    verbose=True,
    allow_delegation=True,
    tools = [scrape_tool, search_tool]
    )

    # Task for news fetching
    fetch_doctors_task = Task(
        description="Search and retrieve at least 6 professionals who are medically acclaimed and well known for their services.Change source immediately if any type of conditions are there to access the site.",
        expected_output="Keeping context lenght under 16385 tokens and output a JSON list(with 'name','workplace','contact', 'description' as keys) and values as retrieved by the agent. Output just the JSON object string and no other strings as prefix or suffix to that object. Just the object string enclosed in [] brackets.",
        agent = doctor_search_agent,
    )
    search_crew = Crew(
    agents=[doctor_search_agent],
    tasks=[fetch_doctors_task],
    verbose=True
    )

    location_inputs =  {
       "lattitude" : str(lat),
       "longitude" : str(lng),
   }


    result = search_crew.kickoff(inputs = location_inputs)


    return result