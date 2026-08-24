# 🖥️ STIC Agent Multiplataforma - Mesa de Ayuda

Agente nativo de descubrimiento automático de Hardware y Software para la plataforma **Mesa de Ayuda**, organizado y optimizado para cada sistema operativo empresarial: **Windows**, **Linux** y **macOS**.

---

## 📁 Estructura del Proyecto

```text
agent/
├── 🪟 windows/
│   ├── STIC-Agent-Installer.exe   # Ejecutable autónomo independiente (NO requiere Python)
│   ├── Instalar-Agente.bat        # Lanzador rápido
│   ├── Desinstalar-Agente.bat     # Desinstalador rápido
│   ├── build.bat                  # Compilador a .exe de 1 clic (PyInstaller)
│   ├── agent.py                   # Motor principal de Windows (CLI / Servicio)
│   ├── collector.py               # Recolector hardware/software (Win32/Registry)
│   ├── installer_gui.py           # Asistente visual con interfaz gráfica (Tkinter)
│   ├── sync.py                    # Cliente HTTP/HTTPS de sincronización
│   └── README.md                  # Guía detallada para Windows
│
├── 🐧 linux/
│   ├── install.sh                 # Script instalador automatizado (con sudo)
│   ├── uninstall.sh               # Script de desinstalación limpia
│   ├── stic-agent.service         # Archivo de servicio para Systemd
│   ├── agent_linux.py             # Motor principal y demonio de Linux
│   ├── collector_linux.py         # Recolector hardware/software (/sys, /proc, dpkg, rpm, etc.)
│   ├── sync.py                    # Cliente HTTP/HTTPS de sincronización
│   └── README.md                  # Guía detallada para distribuciones Linux
│
├── 🍎 macos/
│   ├── install.sh                 # Script instalador automatizado (con sudo)
│   ├── uninstall.sh               # Script de desinstalación limpia
│   ├── gov.yopal.stic-agent.plist # Definición de daemon para Launchd de macOS
│   ├── agent_macos.py             # Motor principal y demonio de macOS
│   ├── collector_macos.py         # Recolector hardware/software (system_profiler / sysctl)
│   ├── sync.py                    # Cliente HTTP/HTTPS de sincronización
│   └── README.md                  # Guía detallada para macOS (Apple Silicon e Intel)
│
└── 📖 README.md                   # Este índice general
```

---

## 🚀 Despliegue Rápido por Sistema Operativo

### 1. 🪟 Windows (Windows 10, 11 y Windows Server)
* **Instalación Manual:**
  1. Copia la carpeta `windows/` (o solo el archivo `STIC-Agent-Installer.exe`) al equipo.
  2. Haz doble clic en **`STIC-Agent-Installer.exe`**.
  3. Ingresa la URL del servidor y presiona **Instalar e Iniciar Servicio**.
* **Instalación Desatendida (GPO / Active Directory):**
  ```cmd
  STIC-Agent-Installer.exe --install --server https://tu-mesa-de-ayuda.vercel.app --org stic --interval 30 --silent
  ```

---

### 2. 🐧 Linux (Ubuntu, Debian, RHEL, CentOS, Rocky Linux, Fedora, Arch)
* **Instalación:**
  1. Copia la carpeta `linux/` al equipo.
  2. Ejecuta en terminal:
     ```bash
     sudo bash install.sh
     ```
  3. El script configurará automáticamente el servicio `systemd` (`stic-agent.service`) y sincronizará en segundo plano.

---

### 3. 🍎 macOS (Apple Silicon M1/M2/M3/M4 e Intel)
* **Instalación:**
  1. Copia la carpeta `macos/` al Mac.
  2. Abre la Terminal y ejecuta:
     ```bash
     sudo bash install.sh
     ```
  3. El script configurará el LaunchDaemon (`/Library/LaunchDaemons/gov.yopal.stic-agent.plist`) para ejecutarse automáticamente al iniciar el Mac.

---

## 🔒 Privacidad y Seguridad
- **Zero Antivirus Flags:** No utiliza binarios ofuscados ni scripts sospechosos.
- **Sincronización Segura:** Comunicación mediante HTTPS nativo hacia la API de Mesa de Ayuda (`/api/assets/sync`).
- **Autonomía:** Cada sistema operativo ejecuta su propio servicio en segundo plano de manera ligera y transparente para el usuario final.
