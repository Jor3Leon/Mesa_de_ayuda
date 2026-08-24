# 🐧 STIC Agent - Guía de Instalación para Linux

Cliente nativo de inventario de Hardware y Software para distribuciones Linux (**Ubuntu, Debian, RedHat, CentOS, Rocky Linux, Fedora, Arch Linux**).

---

## 📋 Requisitos
- Linux con `systemd` (todas las distribuciones modernas).
- Python 3.6 o superior (incluido por defecto en Linux).
- Privilegios de superusuario (`sudo`).

---

## 🚀 Instalación Rápida

### Opción 1: Instalación Interactiva
Copia la carpeta `linux/` al equipo y ejecuta:
```bash
sudo bash install.sh
```
El asistente te preguntará la URL del servidor y el slug de la organización.

### Opción 2: Instalación Desatendida / Automática
```bash
sudo bash install.sh --server "https://tu-mesa-de-ayuda.vercel.app" --org "stic" --interval 30
```

---

## ⚙️ Gestión del Servicio en Linux

| Acción | Comando |
| :--- | :--- |
| **Ver estado del servicio** | `sudo systemctl status stic-agent` |
| **Ver logs en tiempo real** | `sudo journalctl -u stic-agent -f` |
| **Forzar sincronización manual** | `sudo /opt/stic-agent/agent_linux.py sync` |
| **Reiniciar servicio** | `sudo systemctl restart stic-agent` |

---

## 🗑️ Desinstalación

Para eliminar completamente el agente del sistema:
```bash
sudo bash uninstall.sh
```
