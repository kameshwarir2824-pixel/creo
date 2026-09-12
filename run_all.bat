@echo off
title Creo Platform - Launcher
color 0B

echo ===============================================================================
echo                CREO DIGITAL AGENCY PLATFORM - LOCAL RUNNER                    
echo ===============================================================================
echo.

set ROOT_DIR=%~dp0

:: Check if port 8000 is in use, kill stale process if needed
echo [1/4] Checking ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo     Port 8000 is occupied by PID %%a. Freeing port...
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    echo     Port 5173 is occupied by PID %%a. Freeing port...
    taskkill /F /PID %%a >nul 2>&1
)

:: Launch Backend API
echo [2/4] Starting FastAPI Backend (http://127.0.0.1:8000)...
start "Creo Backend API [8000]" cmd /k "cd /d "%ROOT_DIR%backend" && (if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat) && title Creo Backend API [8000] && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Launch Frontend
echo [3/4] Starting Vite Frontend (http://localhost:5173)...
start "Creo Frontend UI [5173]" cmd /k "cd /d "%ROOT_DIR%frontend" && title Creo Frontend UI [5173] && npm run dev"

:: Wait for servers to spin up
echo [4/4] Waiting for services to initialize...
timeout /t 4 /nobreak >nul

:: Launch default browser
start http://localhost:5173

echo.
echo ===============================================================================
echo   SERVICES LAUNCHED SUCCESSFULLY!
echo ===============================================================================
echo   * Client Portal / Admin: http://localhost:5173
echo   * Backend REST API Docs: http://127.0.0.1:8000/docs
echo   * Health Check:          http://127.0.0.1:8000/health
echo.
echo   DEFAULT CREDENTIALS:
echo   --------------------
echo   * Super Admin : admin@creo.agency / Admin123!
echo   * Client User : naveen123login@gmail.com
echo.
echo   NOTE: Keep the separate Backend and Frontend command windows open.
echo   Press any key to close this launcher window (services will stay running).
echo ===============================================================================
pause >nul
