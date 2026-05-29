from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from audio_analyzer import analyze_audio
import json

app = FastAPI(title="Violin Rhythm Trainer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(file: UploadFile = File(...), tempo_bpm: float = Form(60.0)):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(400, "File must be audio")
    audio_bytes = await file.read()
    try:
        notes = analyze_audio(audio_bytes, tempo_bpm=tempo_bpm)
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")
    return {"notes": notes}
