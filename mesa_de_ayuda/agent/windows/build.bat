@echo off
setlocal
cd /d "%~dp0"

echo ======================================================================
echo       COMPILADOR STIC AGENT - WINDOWS EXECUTABLE BUILDER
echo ======================================================================
echo.

if not exist ".venv" (
    echo [1/4] Creando entorno virtual temporal...
    python -m venv .venv
)

echo [2/4] Verificando e instalando PyInstaller...
call .venv\Scripts\pip install --quiet pyinstaller

echo [3/4] Compilando STIC-Agent-Installer.exe...
call .venv\Scripts\pyinstaller --noconfirm --clean --onefile --windowed --name "STIC-Agent-Installer" --add-data "collector.py;." --add-data "sync.py;." --add-data "installer_gui.py;." --hidden-import "winreg" --hidden-import "ctypes" --hidden-import "ctypes.wintypes" --hidden-import "tkinter" --hidden-import "tkinter.ttk" --hidden-import "tkinter.messagebox" agent.py

if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: La compilacion fallo.
    exit /b 1
)

echo [4/4] Limpiando temporales y finalizando...
if exist "dist\STIC-Agent-Installer.exe" (
    copy /y "dist\STIC-Agent-Installer.exe" "STIC-Agent-Installer.exe" >nul
)

:: Limpiar carpetas temporales de compilación
rmdir /s /q "build" 2>nul
rmdir /s /q "dist" 2>nul
rmdir /s /q ".venv" 2>nul
rmdir /s /q "__pycache__" 2>nul
del /f /q "STIC-Agent-Installer.spec" 2>nul

echo.
echo ======================================================================
echo  COMPILACION EXITOSA: STIC-Agent-Installer.exe listo y carpeta limpia.
echo ======================================================================
