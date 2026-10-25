@echo off
cd /d "%~dp0"

echo ===================================================
echo             Starting CineMatch Setup
echo ===================================================

if exist venv goto :VENV_EXISTS
echo [1/4] Creating Python virtual environment...
python -m venv venv
:VENV_EXISTS

echo [2/4] Ensuring Python requirements are installed...
call venv\Scripts\python.exe -m pip install -r backend\requirements.txt

if exist frontend\node_modules goto :NODE_EXISTS
echo [3/4] Installing frontend npm packages...
cd frontend
call npm.cmd install
cd ..
:NODE_EXISTS

if exist backend\data\movies.json goto :DATA_EXISTS
echo [4/4] Building offline dataset from TMDB...
call venv\Scripts\python.exe backend\build_dataset.py
:DATA_EXISTS

echo ---------------------------------------------------
echo Launching CineMatch Backend on port 5001...
start "CineMatch Backend (5001)" cmd /k "venv\Scripts\python.exe -m waitress --listen=127.0.0.1:5001 --threads=4 backend.app:app"

echo Launching CineMatch Frontend on port 5174...
start "CineMatch Frontend (5174)" cmd /k "cd frontend && npm.cmd run dev"

echo Waiting for services to initialize...
timeout /t 4 >nul

echo Opening browser at http://localhost:5174...
start http://localhost:5174

echo ---------------------------------------------------
echo CineMatch is running!
echo Frontend (Vite Dev): http://localhost:5174
echo Backend (API / Prod): http://localhost:5001
echo ===================================================
pause
