from langchain.chat_models import ChatOpenAI
from langchain_core.runnables import RunnablePassthrough
from langchain.chains.conversation.memory import ConversationBufferWindowMemory
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os
import json

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0, openai_api_key=OPENAI_API_KEY)

def get_consultations(question: str, messages: list):

    history = []
    for item in messages:
        history.append({"role": "user", "content": item.query})
        history.append({"role": "assistant", "content": item.response})

    prompt = ChatPromptTemplate.from_template(
        """You are a helpful and precise assistant for answering questions about medical symptoms and conditions. 
        You have access to the following conversation history between the user and you:
        {messages}
        Use this only as a reference to understand the context of the conversation. 
        {question}  
        Answer medical questions to the best of your ability.
        """
    )



    
    setup_and_retrieval = {
        "question": RunnablePassthrough(),
        "messages": lambda x: history     
    }

    chain = setup_and_retrieval | prompt | llm | StrOutputParser()
    result = chain.invoke(question)
    # Run the conversation with the new question
    result = chain.invoke(input=question)
    return result
