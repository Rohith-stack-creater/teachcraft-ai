@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-and-build.ps1"
if errorlevel 1 (
  echo.
  echo Setup failed. Read the error above.
  exit /b 1
)
endlocal
