@echo off
cd /d "%~dp0"
title Desinstalador STIC Agent - Mesa de Ayuda

if exist "C:\ProgramData\STIC-Agent\stic-agent.exe" (
    "C:\ProgramData\STIC-Agent\stic-agent.exe" --uninstall
    exit /b
)

if exist "STIC-Agent-Installer.exe" (
    "STIC-Agent-Installer.exe" --uninstall
    exit /b
)

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    python agent.py --uninstall
    exit /b
)

echo No se pudo ejecutar la desinstalacion automatica.
pause
