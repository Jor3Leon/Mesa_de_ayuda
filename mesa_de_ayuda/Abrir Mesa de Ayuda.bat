@echo off
setlocal

cd /d "%~dp0"

call npm.cmd run dev:up
if errorlevel 1 (
  echo.
  echo No se pudo iniciar Mesa de Ayuda.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:5173"
