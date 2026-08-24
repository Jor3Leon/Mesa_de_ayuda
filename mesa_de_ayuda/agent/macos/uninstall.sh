#!/usr/bin/env bash
# ==============================================================================
# STIC Agent - Desinstalador para macOS
# ==============================================================================

set -e

if [ "$EUID" -ne 0 ]; then
    echo "[ERROR] Este script debe ejecutarse con permisos de administrador (sudo)."
    echo "Ejemplo: sudo bash uninstall.sh"
    exit 1
fi

PLIST_PATH="/Library/LaunchDaemons/gov.yopal.stic-agent.plist"

echo "Deteniendo y removiendo el daemon de macOS..."
if [ -f "$PLIST_PATH" ]; then
    launchctl unload -w "$PLIST_PATH" 2>/dev/null || true
    rm -f "$PLIST_PATH"
fi

echo "Eliminando archivos del agente..."
rm -rf "/Library/Application Support/STIC-Agent"

echo "STIC Agent ha sido desinstalado completamente de este Mac."
