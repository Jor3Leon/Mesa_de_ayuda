#!/usr/bin/env bash
# ==============================================================================
# STIC Agent - Instalador Automatizado para Linux (Systemd)
# Compatible con: Ubuntu, Debian, CentOS, RHEL, Rocky Linux, Fedora, Arch Linux
# ==============================================================================

set -e

# Colores de salida
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}       INSTALADOR STIC AGENT - MESA DE AYUDA (LINUX SYSTEMD)          ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# 1. Verificar privilegios de root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR] Este script debe ejecutarse con permisos de administrador (sudo).${NC}"
    echo "Ejemplo: sudo bash install.sh"
    exit 1
fi

# 2. Verificar Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}[AVISO] Python 3 no se encontro en el sistema. Intentando instalar...${NC}"
    if command -v apt-get &> /dev/null; then
        apt-get update -y && apt-get install -y python3
    elif command -v dnf &> /dev/null; then
        dnf install -y python3
    elif command -v yum &> /dev/null; then
        yum install -y python3
    elif command -v pacman &> /dev/null; then
        pacman -Sy --noconfirm python
    else
        echo -e "${RED}[ERROR] No se pudo instalar Python 3 automaticamente. Por favor instalelo manualmente.${NC}"
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

# Parsear argumentos de línea de comandos si existen
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

# Si no se especificaron por flags, solicitar interactivamente (o usar defaults si no hay tty)
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

INSTALL_DIR="/opt/stic-agent"
CONFIG_DIR="/etc/stic-agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${BLUE}[1/5] Creando directorios del sistema...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"

echo -e "${BLUE}[2/5] Copiando modulos del agente a $INSTALL_DIR...${NC}"
cp -f "$SCRIPT_DIR/agent_linux.py" "$INSTALL_DIR/agent_linux.py"
cp -f "$SCRIPT_DIR/collector_linux.py" "$INSTALL_DIR/collector_linux.py"
cp -f "$SCRIPT_DIR/sync.py" "$INSTALL_DIR/sync.py"
chmod 755 "$INSTALL_DIR/agent_linux.py"

echo -e "${BLUE}[3/5] Guardando configuracion en $CONFIG_DIR/config.json...${NC}"
cat <<EOF > "$CONFIG_DIR/config.json"
{
  "serverUrl": "$SERVER_URL",
  "organizationSlug": "$ORG_SLUG",
  "syncIntervalMinutes": $INTERVAL,
  "apiKey": "",
  "proxy": "",
  "logLevel": "INFO"
}
EOF
chmod 600 "$CONFIG_DIR/config.json"

echo -e "${BLUE}[4/5] Configurando servicio Systemd (stic-agent.service)...${NC}"
if [ -f "$SCRIPT_DIR/stic-agent.service" ]; then
    cp -f "$SCRIPT_DIR/stic-agent.service" /etc/systemd/system/stic-agent.service
    systemctl daemon-reload
    systemctl enable stic-agent.service
    systemctl restart stic-agent.service
    echo -e "${GREEN}      Servicio systemd habilitado e iniciado exitosamente.${NC}"
fi

echo -e "${BLUE}[5/5] Realizando prueba inicial de inventario y sincronizacion...${NC}"
python3 "$INSTALL_DIR/agent_linux.py" sync

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}  INSTALACION EXITOSA: STIC Agent esta activo en segundo plano.       ${NC}"
echo -e "${GREEN}  Estado del servicio: systemctl status stic-agent                    ${NC}"
echo -e "${GREEN}======================================================================${NC}"
