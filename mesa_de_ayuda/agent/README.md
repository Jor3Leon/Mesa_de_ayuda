# STIC Agent - Agente de Inventario Universal

Agente multiplataforma (Windows, Linux, macOS) para sincronizar automáticamente las características de hardware, software y estado de los equipos con el sistema **Mesa de Ayuda**.

## 🚀 Instalación Rápida

### Windows (como Administrador)
```powershell
# Interactivo (wizard de configuración)
.\stic-agent.exe install

# Silencioso (despliegue masivo por GPO)
.\stic-agent.exe install --server https://mesa.vercel.app --org stic --silent
```

### Linux (como root/sudo)
```bash
sudo ./stic-agent install
# o silencioso:
sudo ./stic-agent install --server https://mesa.vercel.app --org stic --silent
```

### macOS
```bash
sudo ./stic-agent install --server https://mesa.vercel.app --org stic
```

## 📋 Comandos

| Comando | Descripción |
| :--- | :--- |
| `stic-agent sync` | Ejecutar sincronización manual |
| `stic-agent install` | Instalar como servicio del sistema |
| `stic-agent uninstall` | Desinstalar agente y limpiar todo |
| `stic-agent status` | Ver estado actual del agente |
| `stic-agent config` | Re-configurar el agente (wizard) |
| `stic-agent help` | Mostrar ayuda |

## ⚙️ Opciones CLI

| Opción | Descripción |
| :--- | :--- |
| `--server, -s <url>` | URL del servidor Mesa de Ayuda |
| `--org, -o <slug>` | Slug de la organización |
| `--api-key, -k <key>` | API Key para autenticación |
| `--interval, -i <min>` | Intervalo de sincronización (minutos) |
| `--proxy <url>` | Proxy HTTP/HTTPS corporativo |
| `--config, -c <path>` | Ruta al archivo de configuración |
| `--no-tls-verify` | Deshabilitar verificación TLS |
| `--silent` | Instalación sin interacción |
| `--log-level <level>` | Nivel de log: debug, info, warn, error |

## 🌐 Entornos Soportados

| Entorno | Ejemplo de `--server` |
| :--- | :--- |
| Web pública (Vercel) | `https://mesa-de-ayuda.vercel.app` |
| Dominio público propio | `https://soporte.yopal.gov.co` |
| Intranet | `http://mesa-ayuda.alcyopal.local` |
| IP directa en LAN | `http://192.168.1.100:5000` |
| VPN corporativa | `https://soporte.vpn.empresa.com` |
| Con proxy | Usar `--proxy http://proxy:8080` |
| Cert. autofirmado | Usar `--no-tls-verify` |

## 📁 Archivos de Configuración

El agente busca configuración en este orden:
1. Argumento `--config <ruta>`
2. `./stic-agent.config.json` (directorio actual)
3. Junto al ejecutable: `stic-agent.config.json`
4. Directorio del sistema:
   - Windows: `C:\ProgramData\STIC-Agent\config.json`
   - Linux: `/etc/stic-agent/config.json`
   - macOS: `/Library/Application Support/STIC-Agent/config.json`

## 🔧 Variables de Entorno

| Variable | Descripción |
| :--- | :--- |
| `STIC_SERVER_URL` | URL del servidor |
| `STIC_ORG_SLUG` | Slug de la organización |
| `STIC_SYNC_INTERVAL` | Intervalo en minutos |
| `STIC_API_KEY` | API Key |
| `STIC_PROXY` | Proxy HTTP |
| `STIC_LOG_LEVEL` | Nivel de log |

## 🔨 Compilación

```bash
# Instalar dependencias
npm install

# Compilar para las 3 plataformas
npm run build

# Genera:
#   dist/stic-agent-win.exe    (Windows x64)
#   dist/stic-agent-linux      (Linux x64)
#   dist/stic-agent-macos      (macOS x64)
```

## 📊 Datos Recolectados

- **Hardware:** CPU, RAM (módulos, tipo, velocidad), discos, tarjeta gráfica, placa base, monitores
- **Red:** IP, MAC, velocidad de enlace, adaptadores activos
- **Sistema:** Hostname, S/N, marca, modelo, tipo de equipo, SO y versión
- **Software:** Lista de programas instalados con nombre, versión y publisher
- **Sesión:** Usuario activo al momento de la sincronización
