from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

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

@app.get("/")
async def root():
    return {"message": "Backend Running"}

@app.get("/api/data")
async def get_data():
    return {"message": "Hello from FastAPI!"}
