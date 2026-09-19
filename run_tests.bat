@echo off
echo =================================================================
echo Running RailOptima Automated Test Suite (Pytest)
echo =================================================================
cd /d "%~dp0"

.venv\Scripts\pytest.exe tests/ -v
pause
