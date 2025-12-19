from fastapi import FastAPI

app = FastAPI(title="Movie Taste API")

@app.get("/health")
def health_check():
    return {"status":"ok"}