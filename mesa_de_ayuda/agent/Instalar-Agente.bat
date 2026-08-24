@echo off
title Instalador STIC Agent
powershell -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File "%~dp0installer\setup-gui.ps1"
