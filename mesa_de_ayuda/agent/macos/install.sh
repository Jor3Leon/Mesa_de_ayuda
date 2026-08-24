#!/usr/bin/env bash
# ==============================================================================
# STIC Agent - Instalador Automatizado para macOS (Launchd)
# Compatible con Apple Silicon (M1/M2/M3/M4) e Intel Macs
# ==============================================================================

set -e

# Colores de salida
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}       INSTALADOR STIC AGENT - MESA DE AYUDA (macOS LAUNCHD)          ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# 1. Verificar permisos de superusuario
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR] Este script debe ejecutarse con permisos de administrador (sudo).${NC}"
    echo "Ejemplo: sudo bash install.sh"
    exit 1
fi

# 2. Verificar Python 3
PYTHON_BIN="/usr/bin/python3"
if [ ! -f "$PYTHON_BIN" ]; then
    if command -v python3 &> /dev/null; then
        PYTHON_BIN="$(which python3)"
    else
        echo -e "${RED}[ERROR] Python 3 no se encontro en macOS. Instale las herramientas de linea de comandos: xcode-select --install${NC}"
        exit 1
    fi
fi

# Valores por defecto
DEFAULT_SERVER="https://mesa-de-ayuda-rho.vercel.app"
DEFAULT_ORG="stic"
DEFAULT_INTERVAL="30"

SERVER_URL=""
ORG_SLUG=""
INTERVAL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --server)
            SERVER_URL="$2"
            shift 2
            ;;
        --org)
            ORG_SLUG="$2"
            shift 2
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

if [ -t 0 ] && [ -z "$SERVER_URL" ]; then
    read -p "URL del Servidor Mesa de Ayuda [$DEFAULT_SERVER]: " input_server
    SERVER_URL="${input_server:-$DEFAULT_SERVER}"

    read -p "Slug de Organizacion [$DEFAULT_ORG]: " input_org
    ORG_SLUG="${input_org:-$DEFAULT_ORG}"

    read -p "Frecuencia de sincronizacion en minutos [$DEFAULT_INTERVAL]: " input_interval
    INTERVAL="${input_interval:-$DEFAULT_INTERVAL}"
else
    SERVER_URL="${SERVER_URL:-$DEFAULT_SERVER}"
    ORG_SLUG="${ORG_SLUG:-$DEFAULT_ORG}"
    INTERVAL="${INTERVAL:-$DEFAULT_INTERVAL}"
fi

INSTALL_DIR="/Library/Application Support/STIC-Agent"
PLIST_DST="/Library/LaunchDaemons/gov.yopal.stic-agent.plist"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${BLUE}[1/5] Creando directorio de la aplicacion en $INSTALL_DIR...${NC}"
mkdir -p "$INSTALL_DIR"

echo -e "${BLUE}[2/5] Copiando modulos del agente a $INSTALL_DIR...${NC}"
cp -f "$SCRIPT_DIR/agent_macos.py" "$INSTALL_DIR/agent_macos.py"
cp -f "$SCRIPT_DIR/collector_macos.py" "$INSTALL_DIR/collector_macos.py"
cp -f "$SCRIPT_DIR/sync.py" "$INSTALL_DIR/sync.py"
chmod 755 "$INSTALL_DIR/agent_macos.py"

echo -e "${BLUE}[3/5] Guardando configuracion en $INSTALL_DIR/config.json...${NC}"
cat <<EOF > "$INSTALL_DIR/config.json"
{
  "serverUrl": "$SERVER_URL",
  "organizationSlug": "$ORG_SLUG",
  "syncIntervalMinutes": $INTERVAL,
  "apiKey": "",
  "proxy": "",
  "logLevel": "INFO"
}
EOF
chmod 600 "$INSTALL_DIR/config.json"

echo -e "${BLUE}[4/5] Configurando e iniciando LaunchDaemon ($PLIST_DST)...${NC}"
if [ -f "$SCRIPT_DIR/gov.yopal.stic-agent.plist" ]; then
    cp -f "$SCRIPT_DIR/gov.yopal.stic-agent.plist" "$PLIST_DST"
    chown root:wheel "$PLIST_DST"
    chmod 644 "$PLIST_DST"

    # Descargar servicio si ya estaba cargado y recargar
    launchctl unload "$PLIST_DST" 2>/dev/null || true
    launchctl load -w "$PLIST_DST"
    echo -e "${GREEN}      Daemon de macOS configurado e iniciado con launchctl.${NC}"
fi

echo -e "${BLUE}[5/5] Ejecutando sincronizacion inicial con el servidor...${NC}"
"$PYTHON_BIN" "$INSTALL_DIR/agent_macos.py" sync

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}  INSTALACION EXITOSA: STIC Agent activo en segundo plano en macOS.   ${NC}"
echo -e "${GREEN}  Daemon: /Library/LaunchDaemons/gov.yopal.stic-agent.plist           ${NC}"
echo -e "${GREEN}======================================================================${NC}"
