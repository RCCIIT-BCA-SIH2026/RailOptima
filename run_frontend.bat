@echo off
echo =================================================================
echo Starting RailOptima Web Frontend (React + Vite on port 5173)...
echo =================================================================
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo node_modules not found. Installing npm dependencies...
    call npm install
)

npm run dev
pause
