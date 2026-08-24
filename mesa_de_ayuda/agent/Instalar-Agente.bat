@echo off
chcp 65001 >nul
title Instalador STIC Agent
powershell -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '%~dp0installer\setup-gui.ps1'"
