@echo off
echo =================================================================
echo Starting RailOptima AI Backend Server (FastAPI on port 8000)...
echo =================================================================
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Python virtual environment not found. Creating .venv...
    python -m venv .venv
    call .venv\Scripts\pip.exe install -r requirements.txt
)

.venv\Scripts\uvicorn.exe backend.app.main:app --host 127.0.0.1 --port 8000 --reload
pause
