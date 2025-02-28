import json
from fastapi import FastAPI, Query
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
    result_str = str(result) if not isinstance(result, str) else result

    return {"status": "success", "articles": json.loads(result_str)}



@app.get("/get-clinics")
async def get_nearby_clinics(lat: float = Query(...), lng: float = Query(...)):
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
   result_str = str(result) if not isinstance(result, str) else result


   return {"status": "success", "clinics": json.loads(result_str)}



@app.get("/get-consultation")
async def get_nearby_clinics(question: str = Query(...)):

    cot_medical_agent = Agent(
    role="AI medical assistant trained in clinical reasoning.",
    goal=(
        '''## Instructions:
                1️⃣ **Understand the Query**: Identify the core medical concern in the user's input {query}.  
                2️⃣ **Consider Relevant Factors**: Age, symptoms, duration, severity, pre-existing conditions, and risk factors.  
                3️⃣ **Generate a Differential Diagnosis**: List possible causes in order of likelihood, explaining reasoning.  
                4️⃣ **Suggest Next Steps**: Provide potential home remedies, lifestyle changes, and whether medical consultation is necessary.  
                5️⃣ **Explain Cautionary Signs**: Mention red flags that indicate urgency (e.g., "If you experience XYZ, seek emergency care immediately.").  
'''
    ),
    backstory=(
        "You are an expert AI medical consultant with a deep understanding of diagnostic reasoning. "
        "Trained in clinical pattern recognition, you analyze symptoms logically and provide detailed "
        "step-by-step medical explanations. Your approach is structured and methodical, ensuring clarity. Keep in mind you dont have to scare the patient."
        "in patient education. Your main objective is to help users understand their symptoms and guide them "
        "on the next steps, including at-home care, lifestyle changes, and when to seek professional help."
    ),
    verbose=True
)
    
    medical_task = Task(
    description="Process the user's medical question using structured reasoning.",
    expected_output=''' Use this structure 
            ## Example:
            **User Input**: "I have had a persistent dry cough for 2 weeks. What could it be?"  
            **Response**:
            1. Common causes include **viral infections, allergies, postnasal drip, GERD, asthma, and early-stage pneumonia**.
            2. Considering risk factors:
            - If the user has **a fever, weight loss, or night sweats**, tuberculosis or lung infection should be ruled out.
            - If they have **acid reflux**, GERD-induced cough is likely.
            3. Recommended next steps:
            - Increase **fluid intake and humidity** to soothe the throat.
            - Avoid triggers like **dust, smoke, and cold air**.
            - Consider **antihistamines if allergies are suspected**.
            - If the cough persists beyond **3-4 weeks or worsens**, consult a doctor for a **chest X-ray or spirometry test**.
            4. **Urgent medical attention needed if**:
            - The cough is **accompanied by blood**.
            - There is **shortness of breath or chest pain**.
            Now, please apply this structured reasoning approach to the following user query:
                **User Query:** "{query}"''',
    agent=cot_medical_agent  
)

    medical_crew = Crew(
        agents=[cot_medical_agent],  
        tasks=[medical_task],
        verbose=True
)
    
    user_query = {
        "query" : str(question),
    }

    result = medical_crew.kickoff(inputs = user_query)


    print("Result------->>>", result)

    return {"status": "success", "answer": str(result)}



@app.get("/get-doctors")
async def get_doctors():
    doctor_search_agent = Agent(
    role="Expert in Doctor Search",
    goal="Find nearby medical professionals with high ratings and decent reviews"
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

    result = search_crew.kickoff()
    print(result)
    result_str = str(result) if not isinstance(result, str) else result

    return {"status": "success", "doctors": json.loads(result_str)}



@app.get("/api/data")
async def get_data():
    return {"message": "Hello from FastAPI! This is from backend!"}
