# 🍎 STIC Agent - Guía de Instalación para macOS

Cliente nativo de inventario de Hardware y Software para equipos Apple (**MacBook Pro, MacBook Air, Mac mini, Mac Studio, iMac, Mac Pro**), compatible con procesadores **Apple Silicon (M1/M2/M3/M4)** y **Intel**.

---

## 📋 Requisitos
- macOS 10.15 (Catalina) o superior (macOS Monterey, Ventura, Sonoma, Sequoia).
- Python 3 (incluido de fábrica en macOS o mediante Xcode Command Line Tools).
- Privilegios de superusuario (`sudo`).

---

## 🚀 Instalación Rápida

### Opción 1: Instalación Interactiva
Copia la carpeta `macos/` al equipo y ejecuta en la Terminal:
```bash
sudo bash install.sh
```
El asistente solicitará la URL del servidor de la Mesa de Ayuda y el slug de la entidad.

### Opción 2: Instalación Desatendida / MDM (Jamf, Mosyle, Kandji, Intune)
```bash
sudo bash install.sh --server "https://tu-mesa-de-ayuda.vercel.app" --org "stic" --interval 30
```

---

## ⚙️ Gestión del Servicio en macOS

| Acción | Comando |
| :--- | :--- |
| **Forzar sincronización manual** | `sudo /usr/bin/python3 "/Library/Application Support/STIC-Agent/agent_macos.py" sync` |
| **Ver logs de actividad** | `cat "/Library/Application Support/STIC-Agent/agent.log"` |
| **Verificar estado en launchctl** | `sudo launchctl list | grep stic-agent` |

---

## 🗑️ Desinstalación

Para eliminar completamente el agente del sistema:
```bash
sudo bash uninstall.sh
```
