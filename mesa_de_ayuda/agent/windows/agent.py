"""
STIC Agent - Main CLI & Service Runner (Windows)
Native, clean, non-malicious Windows inventory synchronization agent.
Supports both direct Python script execution and standalone PyInstaller .EXE binary.
"""

import os
import sys
import json
import time
import argparse
import logging
from datetime import datetime
import shutil

try:
    import winreg
except ImportError:
    winreg = None

from collector import collect_system_data
from sync import sync_to_server

# Default paths
INSTALL_DIR = r"C:\ProgramData\STIC-Agent"
CONFIG_FILE = os.path.join(INSTALL_DIR, "config.json")
LOG_FILE = os.path.join(INSTALL_DIR, "agent.log")
INSTALLED_EXE = os.path.join(INSTALL_DIR, "stic-agent.exe")

DEFAULT_CONFIG = {
    "serverUrl": "https://mesa-de-ayuda-rho.vercel.app",
    "organizationSlug": "stic",
    "syncIntervalMinutes": 30,
    "apiKey": "",
    "proxy": "",
    "logLevel": "INFO"
}


def is_frozen():
    """Check if running inside PyInstaller packaged executable."""
    return getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS')


def setup_logger(log_to_file=True):
    """Configure standard logging."""
    logger = logging.getLogger("STIC_Agent")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")

    # Console Handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    # File Handler
    if log_to_file:
        try:
            if not os.path.exists(INSTALL_DIR):
                os.makedirs(INSTALL_DIR, exist_ok=True)
            fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
            fh.setFormatter(formatter)
            logger.addHandler(fh)
        except Exception:
            pass

    return logger


def load_config():
    """Load configuration from config.json or fall back to defaults."""
    config = DEFAULT_CONFIG.copy()
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8-sig") as f:
                saved = json.load(f)
                config.update(saved)
        except Exception as e:
            print(f"Advertencia: No se pudo leer {CONFIG_FILE}: {e}")
    return config


def save_config(config):
    """Save configuration dictionary to config.json."""
    os.makedirs(INSTALL_DIR, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def perform_sync(server_url=None, org_slug=None, api_key=None, proxy=None):
    """Execute a single inventory collection and synchronization."""
    logger = setup_logger()
    config = load_config()

    server = server_url or config.get("serverUrl", DEFAULT_CONFIG["serverUrl"])
    org = org_slug or config.get("organizationSlug", DEFAULT_CONFIG["organizationSlug"])
    key = api_key if api_key is not None else config.get("apiKey", "")
    prx = proxy if proxy is not None else config.get("proxy", "")

    logger.info(f"Iniciando recoleccion de inventario para organizacion: {org}")
    payload = collect_system_data(org)

    logger.info(f"Enviando datos al servidor: {server}")
    success, message, asset_id = sync_to_server(payload, server_url=server, api_key=key, proxy=prx)

    if success:
        logger.info(f"OK: {message}")
    else:
        logger.error(f"FALLO: {message}")

    return success, message, asset_id


def run_daemon():
    """Run continuous synchronization loop in background."""
    logger = setup_logger(log_to_file=True)
    logger.info("STIC Agent iniciado en modo servicio / segundo plano.")

    while True:
        try:
            config = load_config()
            interval_sec = max(int(config.get("syncIntervalMinutes", 30)) * 60, 60)
            perform_sync()
        except Exception as e:
            logger.error(f"Error en ciclo de sincronizacion: {e}")
            interval_sec = 180

        time.sleep(interval_sec)


def register_control_panel():
    """Register STIC Agent in Windows Control Panel (Programas y caracteristicas)."""
    if not winreg:
        return False

    try:
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\STIC-Agent"
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path)

        if is_frozen() or os.path.exists(INSTALLED_EXE):
            uninstall_cmd = f'"{INSTALLED_EXE}" --uninstall'
        else:
            python_exe = sys.executable
            agent_script = os.path.join(INSTALL_DIR, "agent.py")
            uninstall_cmd = f'"{python_exe}" "{agent_script}" --uninstall'

        today = datetime.now().strftime("%Y%m%d")

        winreg.SetValueEx(key, "DisplayName", 0, winreg.REG_SZ, "STIC Agent - Mesa de Ayuda")
        winreg.SetValueEx(key, "DisplayVersion", 0, winreg.REG_SZ, "2.0.0")
        winreg.SetValueEx(key, "Publisher", 0, winreg.REG_SZ, "Alcaldia de Yopal - STIC")
        winreg.SetValueEx(key, "UninstallString", 0, winreg.REG_SZ, uninstall_cmd)
        winreg.SetValueEx(key, "InstallLocation", 0, winreg.REG_SZ, INSTALL_DIR)
        winreg.SetValueEx(key, "InstallDate", 0, winreg.REG_SZ, today)
        winreg.SetValueEx(key, "NoModify", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(key, "NoRepair", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(key, "HelpLink", 0, winreg.REG_SZ, "https://soporte.yopal.gov.co")

        winreg.CloseKey(key)
        return True
    except Exception as e:
        print(f"No se pudo registrar en Panel de Control: {e}")
        return False


def unregister_control_panel():
    """Remove STIC Agent from Windows Control Panel."""
    if not winreg:
        return
    try:
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Uninstall\STIC-Agent")
    except Exception:
        pass


def register_windows_startup():
    """Register background daemon in Windows Startup (HKCU Run)."""
    if not winreg:
        return False
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_SET_VALUE)
        
        if is_frozen() or os.path.exists(INSTALLED_EXE):
            startup_cmd = f'"{INSTALLED_EXE}" --daemon'
        else:
            pythonw_exe = sys.executable.lower().replace("python.exe", "pythonw.exe")
            if not os.path.exists(pythonw_exe):
                pythonw_exe = sys.executable

            agent_script = os.path.join(INSTALL_DIR, "agent.py")
            startup_cmd = f'"{pythonw_exe}" "{agent_script}" --daemon'

        winreg.SetValueEx(key, "STIC-Agent", 0, winreg.REG_SZ, startup_cmd)
        winreg.CloseKey(key)
        return True
    except Exception as e:
        print(f"No se pudo configurar inicio automatico: {e}")
        return False


def unregister_windows_startup():
    """Remove STIC Agent from Windows Startup."""
    if not winreg:
        return
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_SET_VALUE)
        winreg.DeleteValue(key, "STIC-Agent")
        winreg.CloseKey(key)
    except Exception:
        pass


def install(server_url=None, org_slug=None, interval=None, api_key=None, proxy=None):
    """Full installation procedure."""
    print("=" * 60)
    print("   INSTALADOR STIC AGENT - MESA DE AYUDA (WINDOWS)")
    print("=" * 60)

    # 1. Create target directory
    os.makedirs(INSTALL_DIR, exist_ok=True)
    print(f"[1/5] Directorio de instalacion: {INSTALL_DIR}")

    # 2. Copy binary or python files
    if is_frozen():
        try:
            current_exe = sys.executable
            if os.path.abspath(current_exe).lower() != os.path.abspath(INSTALLED_EXE).lower():
                shutil.copy2(current_exe, INSTALLED_EXE)
            print(f"[2/5] Binario ejecutable copiado: {INSTALLED_EXE}")
        except Exception as e:
            print(f"[2/5] Nota al copiar binario: {e}")
    else:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        files_to_copy = ["agent.py", "collector.py", "sync.py"]
        for f in files_to_copy:
            src = os.path.join(current_dir, f)
            dst = os.path.join(INSTALL_DIR, f)
            if os.path.exists(src):
                shutil.copy2(src, dst)
        print("[2/5] Archivos de script copiados correctamente.")

    # 3. Save configuration
    config = load_config()
    if server_url: config["serverUrl"] = server_url
    if org_slug: config["organizationSlug"] = org_slug
    if interval: config["syncIntervalMinutes"] = int(interval)
    if api_key: config["apiKey"] = api_key
    if proxy: config["proxy"] = proxy
    save_config(config)
    print("[3/5] Configuracion guardada.")

    # 4. Register in Windows Control Panel & Startup
    register_control_panel()
    register_windows_startup()
    print("[4/5] Registrado en 'Programas y caracteristicas' y en Inicio de Windows.")

    # 5. Perform initial sync
    print("[5/5] Realizando primera sincronizacion con el servidor...")
    success, msg, aid = perform_sync()

    print("\n" + "=" * 60)
    if success:
        print(f" INSTALACION EXITOSA: {msg}")
    else:
        print(f" Agente instalado localmente. Nota de sincronizacion: {msg}")
    print("=" * 60)
    return success


def uninstall():
    """Full uninstallation procedure."""
    print("Desinstalando STIC Agent...")
    unregister_windows_startup()
    unregister_control_panel()

    # Delete installation directory
    try:
        if os.path.exists(INSTALL_DIR):
            shutil.rmtree(INSTALL_DIR, ignore_errors=True)
        print("Archivos y registros eliminados con exito.")
    except Exception as e:
        print(f"Nota al borrar archivos: {e}")

    print("Desinstalacion completada.")


def show_status():
    """Print current agent status."""
    print("=" * 50)
    print("   ESTADO DE STIC AGENT")
    print("=" * 50)
    config = load_config()
    print(f"Directorio:    {INSTALL_DIR}")
    print(f"Configurado:   {'Si' if os.path.exists(CONFIG_FILE) else 'No'}")
    print(f"Servidor:      {config.get('serverUrl')}")
    print(f"Organizacion:  {config.get('organizationSlug')}")
    print(f"Frecuencia:    {config.get('syncIntervalMinutes')} minutos")
    print(f"Archivo Log:   {LOG_FILE if os.path.exists(LOG_FILE) else 'Sin logs'}")
    print("=" * 50)


def main():
    parser = argparse.ArgumentParser(description="STIC Agent - Mesa de Ayuda")
    parser.add_argument("command", nargs="?", default="gui", choices=["gui", "sync", "install", "uninstall", "status", "daemon"], help="Comando a ejecutar")
    parser.add_argument("--install", action="store_true", help="Instalar agente")
    parser.add_argument("--uninstall", action="store_true", help="Desinstalar agente")
    parser.add_argument("--daemon", action="store_true", help="Ejecutar en modo servicio silencioso")
    parser.add_argument("--server", type=str, help="URL del servidor")
    parser.add_argument("--org", type=str, help="Slug de la organizacion")
    parser.add_argument("--interval", type=int, help="Intervalo en minutos")
    parser.add_argument("--api-key", type=str, help="API Key de autenticacion")
    parser.add_argument("--proxy", type=str, help="Proxy HTTP/HTTPS")
    parser.add_argument("--silent", action="store_true", help="Instalacion desatendida")

    args = parser.parse_args()

    if args.uninstall or args.command == "uninstall":
        uninstall()
    elif args.daemon or args.command == "daemon":
        run_daemon()
    elif args.install or args.command == "install":
        install(server_url=args.server, org_slug=args.org, interval=args.interval, api_key=args.api_key, proxy=args.proxy)
    elif args.command == "status":
        show_status()
    elif args.command == "sync":
        perform_sync(server_url=args.server, org_slug=args.org, api_key=args.api_key, proxy=args.proxy)
    else:
        # Default: Launch GUI installer
        try:
            from installer_gui import main as gui_main
            gui_main()
        except Exception as e:
            print(f"Iniciando en modo CLI (no se pudo abrir interfaz grafica: {e})")
            install(server_url=args.server, org_slug=args.org, interval=args.interval, api_key=args.api_key, proxy=args.proxy)


if __name__ == "__main__":
    main()
