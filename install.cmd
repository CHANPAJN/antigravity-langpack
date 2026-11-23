@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Official Node.js ^>= 22.13 is required. Download from https://nodejs.org/
  exit /b 1
)
node --disable-warning=ExperimentalWarning cli.mjs install %*
endlocal
