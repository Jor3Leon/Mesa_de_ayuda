# 🪟 STIC Agent - Guía de Instalación para Windows

Cliente nativo de inventario de Hardware y Software para equipos Windows (**Windows 10, Windows 11 y Windows Server 2012+**).

---

## 📦 Opciones de Instalación

### Opción 1: Ejecutable Autónomo (Recomendado - Sin Dependencias)
No requiere tener Python instalado en el equipo cliente.

1. Abre la carpeta `windows/`.
2. Haz doble clic en **`STIC-Agent-Installer.exe`** (o en `Instalar-Agente.bat`).
3. En la interfaz gráfica:
   - Verifica la **URL del Servidor** (ej. `https://tu-mesa-de-ayuda.vercel.app`).
   - Verifica el **Slug de la Organización** (ej. `stic`).
   - Haz clic en **Probar Conexión**.
   - Haz clic en **Instalar e Iniciar Servicio**.

> El instalador se registrará automáticamente en **Panel de Control → Programas y características** y en el **Inicio de Windows** para ejecutarse en segundo plano silenciosamente.

---

### Opción 2: Instalación Desatendida / GPO (Línea de Comandos)
Para despliegues masivos por Active Directory / GPO / Scripts:

```cmd
STIC-Agent-Installer.exe --install --server https://tu-mesa-de-ayuda.vercel.app --org stic --interval 30 --silent
```

---

## 🛠️ Recompilación del Ejecutable
Si realizas modificaciones en el código fuente del agente en Windows, puedes recompilar el ejecutable `.exe` con un solo clic ejecutando:

```cmd
build.bat
```
*(Crea automáticamente el entorno virtual aislado y compila `STIC-Agent-Installer.exe` usando PyInstaller).*

---

## 🗑️ Desinstalación

- **Desde Panel de Control:** Ve a *Configuración / Panel de Control → Aplicaciones instaladas → STIC Agent - Mesa de Ayuda → Desinstalar*.
- **Desde la carpeta:** Ejecuta **`Desinstalar-Agente.bat`** o el comando `STIC-Agent-Installer.exe --uninstall`.
