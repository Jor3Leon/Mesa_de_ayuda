# Agente de Descubrimiento CMDB

Este agente permite la recolección automática de información de hardware y software para el módulo CMDB.

## Requisitos
- Windows 10/11 o Windows Server 2012+.
- PowerShell 5.1 o superior.
- Conectividad a la red donde se aloja el backend.

## Uso Manual
1. Abrir PowerShell como Administrador.
2. Ejecutar el comando:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\agent\discovery-agent.ps1
   ```

## Automatización (Tarea Programada)
Para ejecutar el inventario automáticamente todos los días:

1. Abrir **Programador de Tareas** (Task Scheduler).
2. Crear una nueva tarea básica.
3. Nombre: `CMDB_Discovery_Agent`.
4. Desencadenador: Diariamente.
5. Acción: Iniciar un programa.
6. Programa/script: `powershell.exe`
7. Agregar argumentos: `-ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Ruta\Al\Agente\discovery-agent.ps1"`

## Configuración del Agente
Si el backend cambia de dirección, edita la variable `$apiUrl` al inicio del script `agent/discovery-agent.ps1`.
