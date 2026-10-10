
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Local testing only
    allow_methods=["*"],
    allow_headers=["*"],
)

class Post(BaseModel):
    text: str

@app.get("/")
def home():
    return {"message": "Students Harate API is running!"}

@app.post("/check-post")
def check_post(post: Post):
    text = post.text.strip()

    if not text:
        return {
            "allowed": False,
            "message": "Post cannot be empty"
        }

    if len(text) > 5000:
        return {
            "allowed": False,
            "message": "Post is too long"
        }

    return {
        "allowed": True,
        "message": "Post passed the basic check"
    }

