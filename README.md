Autism Screening Prototype — Backend

This FastAPI backend exposes a single endpoint POST /analyze which accepts JSON with the following shape:

{
  "age": number,
  "eye_contact": string,
  "speech_level": string,
  "social_response": string,
  "sensory_reactions": string
}

It attempts to call the OpenAI Chat Completions API when `OPENAI_API_KEY` is set in the environment; otherwise it returns a deterministic heuristic response for offline testing.

Installation
1. python -m venv .venv
2. source .venv/bin/activate
3. pip install -r requirements.txt

Run
1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` if you have one.
2. uvicorn main:app --reload --port 8000
