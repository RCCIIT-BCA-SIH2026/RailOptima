@echo off
echo =================================================================
echo Starting RailOptima ML Microservice (FastAPI on port 8001)...
echo =================================================================
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Python virtual environment not found. Creating .venv...
    python -m venv .venv
    call .venv\Scripts\pip.exe install -r ml/requirements.txt
)

.venv\Scripts\uvicorn.exe ml.service:app --host 127.0.0.1 --port 8001 --reload
pause
