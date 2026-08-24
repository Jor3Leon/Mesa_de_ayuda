# 🖥️ STIC Agent v2.0 (Python Nativo) - Mesa de Ayuda

Cliente ligero y nativo para la recolección automática del inventario de Hardware y Software de equipos Windows y su sincronización con la plataforma **Mesa de Ayuda**.

---

## ✨ Características Principales

- **100% Nativo en Python 3:** Sin dependencias externas ni compiladores que generen falsos positivos en antivirus corporativos (Kaspersky, Windows Defender).
- **Lectura Directa de Hardware y Software:**
  - Procesador (CPU), Memoria RAM y Almacenamiento (Disco C:).
  - Placa Base, Fabricante, Modelo y Número de Serie.
  - Dirección IP, Dirección MAC y Nombre de Equipo.
  - Usuario de sesión activo y dominio.
  - Listado completo de Software instalado obtenido directamente del Registro de Windows.
- **Registro Oficial en Windows:** Aparece en **Panel de control → Programas y características** como aplicación instalada.
- **Inicio Automático Silencioso:** Se ejecuta en segundo plano como servicio de usuario (`pythonw.exe`).
- **Instalador Gráfico Multilenguaje:** Asistente visual con soporte para **Español** e **Inglés** y botón para probar la conexión con el servidor.

---

## 🚀 Instalación Rápida

### Opción 1: Asistente Visual (Recomendado)
1. Haz doble clic en **`Instalar-Agente.pyw`** (o en `Instalar-Agente.bat`).
2. Ingresa la **URL del Servidor** (ej. `https://tu-mesa-de-ayuda.vercel.app`).
3. Ingresa el **Slug de Organización** (ej. `stic`).
4. Haz clic en **Probar Conexión** para verificar que el servidor responda.
5. Haz clic en **Instalar e Iniciar Servicio**.

### Opción 2: Instalación por Línea de Comandos / Desatendida (GPO)
```powershell
python agent.py install --server https://tu-mesa.vercel.app --org stic --interval 30 --silent
```

---

## 🗑️ Desinstalación

- **Desde Panel de Control:** Ve a *Programas y características* → Selecciona *STIC Agent - Mesa de Ayuda* → Desinstalar.
- **Desde la carpeta:** Haz doble clic en **`Desinstalar-Agente.bat`** o ejecuta:
  ```powershell
  python agent.py uninstall
  ```

---

## 📂 Estructura de Archivos

```
agent/
├── agent.py               # Motor principal (sync, daemon, install, uninstall)
├── collector.py           # Recolector nativo de Hardware y Software (Registry/Win32)
├── sync.py                # Cliente HTTP/HTTPS para envío a la API
├── installer_gui.py       # Asistente visual Tkinter multilenguaje
├── Instalar-Agente.pyw    # Lanzador gráfico sin consola
├── Instalar-Agente.bat    # Lanzador por lotes
├── Desinstalar-Agente.bat # Desinstalador por lotes
└── README.md              # Documentación de uso
```
