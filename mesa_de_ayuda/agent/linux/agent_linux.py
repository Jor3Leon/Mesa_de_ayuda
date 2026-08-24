"""
STIC Agent - Main CLI & Service Runner (Linux)
Native systemd background daemon and command-line management tool.
"""

import os
import sys
import json
import time
import argparse
import logging
import shutil
import subprocess

from collector_linux import collect_system_data
from sync import sync_to_server

# Linux Standard Paths
INSTALL_DIR = "/opt/stic-agent"
CONFIG_DIR = "/etc/stic-agent"
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")
LOG_FILE = "/var/log/stic-agent.log"
SYSTEMD_SERVICE = "/etc/systemd/system/stic-agent.service"

DEFAULT_CONFIG = {
    "serverUrl": "https://mesa-de-ayuda-rho.vercel.app",
    "organizationSlug": "stic",
    "syncIntervalMinutes": 30,
    "apiKey": "",
    "proxy": "",
    "logLevel": "INFO"
}


def setup_logger(log_to_file=True):
    """Configure standard logging."""
    logger = logging.getLogger("STIC_Agent_Linux")
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
            fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
            fh.setFormatter(formatter)
            logger.addHandler(fh)
        except Exception:
            # Fallback if cannot write to /var/log
            try:
                local_log = os.path.join(INSTALL_DIR, "agent.log")
                fh = logging.FileHandler(local_log, encoding="utf-8")
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
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                config.update(saved)
        except Exception as e:
            print(f"Advertencia: No se pudo leer {CONFIG_FILE}: {e}")
    return config


def save_config(config):
    """Save configuration dictionary to config.json."""
    os.makedirs(CONFIG_DIR, exist_ok=True)
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

    logger.info(f"Iniciando recoleccion de inventario Linux para: {org}")
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
    logger.info("STIC Agent iniciado en modo servicio Linux (systemd).")

    while True:
        try:
            config = load_config()
            interval_sec = max(int(config.get("syncIntervalMinutes", 30)) * 60, 60)
            perform_sync()
        except Exception as e:
            logger.error(f"Error en ciclo de sincronizacion: {e}")
            interval_sec = 180

        time.sleep(interval_sec)


def show_status():
    """Print current agent status."""
    print("=" * 50)
    print("   ESTADO DE STIC AGENT (LINUX)")
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
    parser = argparse.ArgumentParser(description="STIC Agent - Linux Helpdesk Discovery")
    parser.add_argument("command", nargs="?", default="sync", choices=["sync", "daemon", "status"], help="Comando a ejecutar")
    parser.add_argument("--daemon", action="store_true", help="Ejecutar en modo demonio")
    parser.add_argument("--server", type=str, help="URL del servidor")
    parser.add_argument("--org", type=str, help="Slug de la organizacion")
    parser.add_argument("--interval", type=int, help="Intervalo en minutos")
    parser.add_argument("--api-key", type=str, help="API Key de autenticacion")
    parser.add_argument("--proxy", type=str, help="Proxy HTTP/HTTPS")

    args = parser.parse_args()

    if args.daemon or args.command == "daemon":
        run_daemon()
    elif args.command == "status":
        show_status()
    else:
        perform_sync(server_url=args.server, org_slug=args.org, api_key=args.api_key, proxy=args.proxy)


if __name__ == "__main__":
    main()
