@echo off
echo =================================================================
echo Launching Indian Railways AI Block Planning System (RailOptima)
echo =================================================================
cd /d "%~dp0"

echo [1/3] Launching ML Microservice (FastAPI on http://127.0.0.1:8001)...
start "RailOptima ML Service" cmd /k "run_ml.bat"

echo [2/3] Launching Backend Server (FastAPI on http://127.0.0.1:8000)...
start "RailOptima Backend" cmd /k "run_backend.bat"

echo [3/3] Launching Frontend Web App (React + Vite on http://127.0.0.1:5173)...
start "RailOptima Frontend" cmd /k "run_frontend.bat"

echo.
echo All services launched!
echo - Web Dashboard: http://127.0.0.1:5173
echo - Backend API Docs: http://127.0.0.1:8000/docs
echo - ML Microservice Docs: http://127.0.0.1:8001/docs
echo.
timeout /t 3 >nul
start http://127.0.0.1:5173

