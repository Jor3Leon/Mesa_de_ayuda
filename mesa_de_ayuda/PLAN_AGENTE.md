# Planificación: Agente de Inventario (Asset Discovery Agent)

Este documento guarda la conversación y las ideas preliminares para el desarrollo del agente de inventario automático, para retomarlo en la próxima sesión.

## La Necesidad
El proyecto de "Mesa de Ayuda" depende de instalar un agente en los equipos de la entidad/empresa para recopilar la información de los equipos TI (hardware, software, red) y que esta información se cargue al sistema de inventario automáticamente, evitando el ingreso manual de activos.

## Capacidades del Agente
El agente debe ser capaz de extraer:
- **Hardware:** Fabricante, Modelo, Número de Serie (Service Tag), Procesador (CPU), Memoria RAM total/disponible, Discos Duros (capacidad y espacio libre).
- **Red:** Nombre del equipo (Hostname), Dirección IP, Dirección MAC.
- **Software:** Sistema Operativo y su versión (Opcional: software instalado).

## Arquitectura Propuesta
1. **El Agente (Cliente):** Un ejecutable o script que corre localmente en los equipos de los usuarios.
2. **La Comunicación:** El agente envía un payload (JSON) a través de una petición HTTP/HTTPS (POST) de forma segura.
3. **El Servidor (Backend):** Se creará un nuevo endpoint en el backend (ej. `/api/inventory/sync`) que reciba los datos del agente, valide la información (usando la MAC address o el Número de Serie como identificador único) y cree o actualice el registro del equipo en la base de datos de la Mesa de Ayuda.

## Opciones de Tecnología para el Agente (A decidir en la próxima sesión)

### Opción A: Script de PowerShell (Enfoque Windows-Nativo)
- **Ventajas:** No requiere instalación. Se puede desplegar masivamente a través de Políticas de Grupo (GPO) de Active Directory. Ideal si el 100% del parque informático es Windows.
- **Desventajas:** Dependiente del ecosistema de Microsoft.

### Opción B: Go (Golang) (Enfoque Multiplataforma y Profesional)
- **Ventajas:** Permite compilar un único archivo ejecutable (`.exe` para Windows, binarios para Mac/Linux) súper ligero sin dependencias externas. Alta velocidad y bajo consumo de recursos.
- **Desventajas:** Requiere escribir el código en Go (totalmente factible).

### Opción C: Python / C# (Enfoque Servicio Continuo)
- **Ventajas:** Librerías muy potentes (`psutil`, `wmi`). Ideal si se busca que el agente corra permanentemente como un servicio de Windows recopilando datos en tiempo real (uso de CPU, temperatura, alertas en vivo).

## Próximos Pasos para la Siguiente Sesión
1. Definir el **Sistema Operativo** principal de los equipos cliente de la empresa.
2. Elegir el **Lenguaje / Enfoque** (PowerShell, Go, o Python/C#).
3. Diseñar el **Endpoint** en el backend actual (Node/Express) para recibir los datos.
4. Programar el recolector y hacer las primeras pruebas de transmisión de datos.
