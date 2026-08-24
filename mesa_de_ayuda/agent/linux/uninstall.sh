#!/usr/bin/env bash
# ==============================================================================
# STIC Agent - Desinstalador para Linux
# ==============================================================================

set -e

if [ "$EUID" -ne 0 ]; then
    echo "[ERROR] Este script debe ejecutarse con permisos de administrador (sudo)."
    echo "Ejemplo: sudo bash uninstall.sh"
    exit 1
fi

echo "Deteniendo y deshabilitando servicio systemd..."
if systemctl is-active --quiet stic-agent.service; then
    systemctl stop stic-agent.service || true
fi

if systemctl is-enabled --quiet stic-agent.service; then
    systemctl disable stic-agent.service || true
fi

if [ -f /etc/systemd/system/stic-agent.service ]; then
    rm -f /etc/systemd/system/stic-agent.service
    systemctl daemon-reload
fi

echo "Eliminando archivos del agente..."
rm -rf /opt/stic-agent
rm -rf /etc/stic-agent
rm -f /var/log/stic-agent.log

echo "STIC Agent ha sido desinstalado completamente de este equipo."
