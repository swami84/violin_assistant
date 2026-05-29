# Violin Rhythm Trainer

A web app that listens to your violin playing through the microphone, compares it against sheet music, and gives per-note feedback on pitch, timing, and duration.

![Tech Stack](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue) ![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20librosa-green)

---

## Features

- **Sheet music rendering** — VexFlow renders the lesson notation in the browser, wrapping across rows automatically
- **Microphone recording** — one-click record/stop using the Web Audio API
- **Beat indicator** — visual metronome pulses each beat during recording to help you keep tempo
- **Audio analysis** — pitch detected via `librosa.pyin`, onsets via `librosa.onset_detect`, decoded from browser audio (webm/ogg) using ffmpeg
- **Per-note feedback** — each note is color-coded: correct, wrong pitch, too late, too early, too short, missed, or extra
- **Tempo-aware onset filtering** — minimum gap between detected notes scales with lesson BPM to suppress false triggers from bow vibration and vibrato

---

## Feedback colors

| Color | Meaning |
|-------|---------|
| Green | Correct pitch and timing |
| Red | Wrong pitch |
| Yellow | Note played too late or too early (>150ms) |
| Orange | Note too short (not held long enough) |
| Gray | Missed — no matching note detected |
| Purple | Extra note played that wasn't in the sheet music |

---

## Project structure

```
violin_assistant/
├── backend/
│   ├── main.py              # FastAPI: /health + /analyze endpoints
│   ├── audio_analyzer.py    # ffmpeg decode → librosa pyin + onset detection
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── types.ts
│   │   ├── components/
│   │   │   ├── SheetMusic.tsx       # VexFlow notation renderer
│   │   │   ├── Recorder.tsx         # Microphone recording
│   │   │   ├── BeatIndicator.tsx    # Visual metronome
│   │   │   └── FeedbackDisplay.tsx  # Per-note results
│   │   └── utils/
│   │       ├── noteConverter.ts     # Beats → seconds timeline
│   │       └── comparison.ts        # Match detected vs expected notes
│   ├── package.json
│   └── vite.config.ts
├── lessons/
│   ├── lesson1_open_d.json
│   └── lesson5.json
├── docker-compose.yml
└── README.md
```

---

## Quick start (local)

### Prerequisites

- Python 3.11+
- Node.js 20+
- ffmpeg (`sudo apt install ffmpeg` or `brew install ffmpeg`)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

The Vite dev server proxies `/api/*` → `http://localhost:8000`, so both must be running.

### With Docker

```bash
docker-compose up --build
```

---

## Lesson JSON format

```json
{
  "title": "My Lesson",
  "time_signature": "4/4",
  "tempo_bpm": 60,
  "measures": [
    {
      "measure": 1,
      "events": [
        { "type": "note", "pitch": "D4", "duration_beats": 1 },
        { "type": "note", "pitch": "E4", "duration_beats": 1 },
        { "type": "rest", "duration_beats": 2 }
      ]
    }
  ]
}
```

| Field | Values |
|-------|--------|
| `time_signature` | `"2/4"` or `"4/4"` |
| `tempo_bpm` | any integer (e.g. 60, 80, 100) |
| `type` | `"note"` or `"rest"` |
| `pitch` | `"D4"`, `"F#4"`, `"Bb3"`, etc. (omit for rests) |
| `duration_beats` | `1` = quarter, `2` = half, `4` = whole |

Load any lesson JSON using the **Load JSON** button in the app.

---

## API

### `POST /analyze`

Accepts a multipart form with:
- `file` — audio file (webm, ogg, wav, or any ffmpeg-supported format)
- `tempo_bpm` — lesson tempo (used to tune onset detection sensitivity)

Returns:
```json
{
  "notes": [
    { "pitch": "D4", "start_sec": 0.12, "duration_sec": 0.85 }
  ]
}
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Notation | VexFlow 4.x |
| Recording | Web Audio API (MediaRecorder) |
| Backend | FastAPI, Python 3.11 |
| Pitch detection | librosa.pyin |
| Onset detection | librosa.onset_detect |
| Audio decoding | ffmpeg (via subprocess) |
| Containerization | Docker + docker-compose |
