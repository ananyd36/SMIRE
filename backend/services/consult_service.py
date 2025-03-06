from crewai import Crew, Task, Agent
from crewai_tools import ScrapeWebsiteTool, SerperDevTool
from fastapi import Query


search_tool = SerperDevTool()
scrape_tool = ScrapeWebsiteTool()



def get_consultations(question: str = Query(...)):

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

    return result
