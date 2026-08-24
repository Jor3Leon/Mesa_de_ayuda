@echo off
title Desinstalador STIC Agent
powershell -ExecutionPolicy Bypass -NoProfile -Command "schtasks /Delete /TN STIC-Agent-Sync /F 2>$null; Remove-Item -Path 'C:\ProgramData\STIC-Agent' -Recurse -Force -ErrorAction SilentlyContinue; [System.Windows.Forms.MessageBox]::Show('✅ El Agente STIC ha sido desinstalado correctamente.', 'Desinstalado', 0, 64)"
