@echo off
echo =================================================================
echo Launching Indian Railways AI Block Planning System (RailOptima)
echo =================================================================
cd /d "%~dp0"

echo [1/2] Launching Backend Server (FastAPI on http://127.0.0.1:8000)...
start "RailOptima Backend" cmd /k "run_backend.bat"

echo [2/2] Launching Frontend Web App (React + Vite on http://127.0.0.1:5173)...
start "RailOptima Frontend" cmd /k "run_frontend.bat"

echo.
echo All services launched!
echo - Web Dashboard: http://127.0.0.1:5173
echo - Swagger API Docs: http://127.0.0.1:8000/docs
echo.
timeout /t 3 >nul
start http://127.0.0.1:5173
