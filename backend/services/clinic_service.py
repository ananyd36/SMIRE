from crewai import Crew, Task, Agent
from crewai_tools import ScrapeWebsiteTool, SerperDevTool
import json
from fastapi import Query


search_tool = SerperDevTool()
scrape_tool = ScrapeWebsiteTool()




def get_nearby_clinics(lat: float = Query(...), lng: float = Query(...)):
   clinic_search_agent = Agent(
       role="Clinic and Hospital Location Finder Expert",
       goal="Find nearby hospitals, clinics, and doctors with their addresses, images, and descriptions from publicly available and accessible sites. Use {lattitude} lattitude and {longitude} longitude to base your reference point",
       backstory="An expert in medical facilities, using internet searches and API lookups "
                 "to provide real-time location data for clinics and hospitals.",
       verbose=True,
       allow_delegation=True,
       tools=[search_tool, scrape_tool] 
   )


   fetch_clinics_task = Task(
       description="Find at least 4 nearby clinics, hospitals, or doctors. "
                    "Remember to find only highly reviewed places and highly rated doctors."
                    "Remember to scrap data from only fully accesible sites with high reviews or ratings. Change source immediately if any type of conditions are there to access the site."
                   "Include their name, address, an image link, and a brief description.",
       expected_output="A JSON list (with 'Name', 'Location', 'Link', and 'Description' as keys) "
                       "containing details of medical centers.",
       agent=clinic_search_agent
   )


   clinic_crew = Crew(
       agents=[clinic_search_agent],
       tasks=[fetch_clinics_task],
       verbose=True
   )


   location_inputs =  {
       "lattitude" : str(lat),
       "longitude" : str(lng),
   }


   print(location_inputs)




   result = clinic_crew.kickoff(inputs = location_inputs)
   print("Result------->>>", result)


   return result
