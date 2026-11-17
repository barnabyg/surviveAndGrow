@echo off
rem Start Survive and Grow and open it in the browser.
setlocal
cd /d "%~dp0"

where npm >NUL 2>NUL
if errorlevel 1 (
  echo Node.js 24 or later is required. Install it from https://nodejs.org/ and run this again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm ci
  if errorlevel 1 (
    echo Installing dependencies failed.
    pause
    exit /b 1
  )
)

call npm run play

endlocal
