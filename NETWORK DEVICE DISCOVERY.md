# NETWORK DISCOVERY — INTEGRACIÓN NATIVA CON RMM, DISPOSITIVOS Y CMDB

## INSTRUCCIÓN ÚNICA DE IMPLEMENTACIÓN

Implementar una funcionalidad de descubrimiento automático de dispositivos de red dentro de la plataforma RMM existente, utilizando el agente RMM actualmente desplegado y adaptándose estrictamente a la arquitectura, modelos, servicios, componentes, APIs, permisos, base de datos y flujos que YA existen en el proyecto.

La finalidad principal es permitir que el administrador pueda proporcionar una dirección IP previamente reservada para un dispositivo de red, por ejemplo:

10.0.5.56

y que el agente RMM existente, desde la red local donde se encuentra instalado, consulte dicha dirección IP, identifique el dispositivo cuando técnicamente sea posible y devuelva la información disponible para que posteriormente sea registrada y sincronizada utilizando las estructuras existentes de la plataforma.

IMPORTANTE:

NO crear un nuevo sistema independiente de inventario.

NO crear un nuevo módulo de dispositivos.

NO crear una nueva CMDB.

NO crear un segundo agente.

NO reemplazar el módulo actual de Dispositivos.

NO reemplazar el módulo actual de CMDB.

NO modificar la lógica actual de Dispositivos ni CMDB sin necesidad técnica demostrada.

NO renombrar módulos existentes.

NO cambiar la arquitectura existente solamente para adaptar esta funcionalidad.

NO duplicar entidades existentes.

NO duplicar tablas existentes.

NO duplicar servicios existentes.

NO duplicar APIs existentes.

NO duplicar componentes frontend existentes.

NO crear una arquitectura paralela.

La funcionalidad debe integrarse como una nueva capacidad de la plataforma actual.

La regla fundamental de implementación será:

ANALIZAR → COMPRENDER → REUTILIZAR → EXTENDER ÚNICAMENTE SI ES NECESARIO → IMPLEMENTAR → PROBAR

Nunca:

CREAR → REEMPLAZAR → ROMPER LO EXISTENTE

---

## CONTEXTO FUNCIONAL EXISTENTE

La plataforma ya dispone de un agente RMM que actualmente detecta y registra computadores.

El agente existente recopila información de los equipos informáticos, incluyendo, según las capacidades actuales del proyecto:

- Nombre del equipo.
- Características de hardware.
- Procesador.
- Memoria.
- Discos.
- Sistema operativo.
- Software.
- Información de red.
- Estado.
- Información técnica.
- Otros datos que actualmente soporte el agente.

Los computadores ya son gestionados desde el módulo existente denominado:

DISPOSITIVOS

La descripción funcional existente de este módulo es:

"Consola operativa de equipos, agente y trazabilidad técnica administra el parque tecnológico con filtros, edición, detalle técnico y acciones rápidas por dispositivo."

Existe además un módulo existente denominado:

CMDB

La descripción funcional existente de este módulo es:

"Consola Operativa CMDB Monitoreo en tiempo real de la salud del parque informático, inventario de hardware y software, y gestión de mantenimientos preventivos."

ESTOS DOS MÓDULOS YA EXISTEN Y DEBEN CONSERVARSE.

El objetivo de esta implementación es agregar la capacidad de descubrir dispositivos de red y hacer que los dispositivos descubiertos puedan integrarse con las estructuras existentes de DISPOSITIVOS y CMDB.

---

## OBJETIVO FUNCIONAL

Permitir que el administrador pueda indicar una IP reservada de una impresora, escáner o equipo multifuncional y solicitar su descubrimiento desde la plataforma.

Ejemplo:

IP:

10.0.5.56

El sistema debe utilizar un agente RMM existente que tenga acceso a la red local.

El flujo conceptual será:

PLATAFORMA RMM
→ AGENTE RMM EXISTENTE
→ RED LOCAL
→ IP DEL DISPOSITIVO
→ DESCUBRIMIENTO
→ RESULTADO
→ ESTRUCTURA EXISTENTE DE DISPOSITIVOS
→ ESTRUCTURA EXISTENTE DE CMDB

El sistema debe detectar, cuando técnicamente sea posible:

- Impresoras de red.
- Escáneres de red.
- Equipos multifuncionales.
- Otros dispositivos de red compatibles en futuras ampliaciones.

La primera implementación debe centrarse en:

PRINTER
SCANNER
MULTIFUNCTION

---

## REGLA ARQUITECTÓNICA PRINCIPAL

La funcionalidad de Network Discovery NO debe convertirse en un inventario separado.

Network Discovery únicamente debe descubrir y proporcionar información.

El módulo existente DISPOSITIVOS debe continuar siendo el lugar donde se administran los activos tecnológicos.

El módulo existente CMDB debe continuar siendo el lugar donde se gestionan los Configuration Items, relaciones, monitoreo, mantenimiento y demás capacidades CMDB existentes.

La integración conceptual debe ser:

NETWORK DISCOVERY
        ↓
DISPOSITIVOS
        ↓
CMDB

Pero esta representación es conceptual.

La implementación real debe adaptarse a las relaciones y servicios que ya existen en el código.

---

## PRIMERA FASE OBLIGATORIA: AUDITORÍA DEL PROYECTO

ANTES DE CREAR, MODIFICAR O ELIMINAR CUALQUIER ARCHIVO, realizar una auditoría completa del repositorio.

No comenzar programando inmediatamente.

Primero comprender completamente cómo funciona actualmente la plataforma.

La auditoría debe revisar como mínimo:

- Arquitectura general.
- Backend.
- Frontend.
- Base de datos.
- ORM.
- Agente RMM.
- Comunicación agente/backend.
- Sistema de autenticación.
- Sistema de autorización.
- RBAC.
- Organizaciones.
- Sedes.
- Usuarios.
- Dispositivos.
- Assets.
- CMDB.
- Configuration Items.
- Monitoring.
- Maintenance.
- Notifications.
- Audit.
- Jobs.
- Queues.
- WebSockets, si existen.
- REST API.
- Event bus, si existe.
- Logs.
- Sistema de sincronización.
- Componentes UI.
- Sistema de diseño.
- Estado global frontend.
- Servicios frontend.
- Servicios backend.

No asumir nombres de archivos, carpetas, tablas o entidades.

Descubrirlos mediante inspección real del repositorio.

---

## AUDITORÍA ESPECÍFICA DEL MÓDULO DISPOSITIVOS

Analizar exactamente cómo está construido actualmente el módulo DISPOSITIVOS.

Determinar:

- Ruta frontend.
- Ruta backend.
- Controllers.
- Services.
- Repositories.
- Entities.
- Models.
- DTOs.
- Schemas.
- Hooks.
- Stores.
- APIs.
- Componentes.
- Tablas.
- Relaciones.
- Permisos.
- Filtros.
- Detalle técnico.
- Acciones rápidas.
- Estado del dispositivo.
- Sistema de trazabilidad.

Determinar cómo se registra actualmente un computador.

Determinar qué entidad representa actualmente un dispositivo.

Determinar si existe una entidad equivalente a:

Device
Asset
ManagedDevice
Endpoint
InventoryItem
Computer

NO crear una entidad nueva hasta comprobar que realmente no existe una estructura reutilizable.

Si existe una entidad adecuada, utilizarla.

Si necesita nuevos campos para soportar impresoras, escáneres o multifuncionales, evaluar primero si esos campos pueden manejarse mediante las estructuras actuales.

No alterar el comportamiento actual de los computadores.

---

## AUDITORÍA ESPECÍFICA DEL MÓDULO CMDB

Analizar exactamente cómo está construido actualmente CMDB.

Determinar:

- Entidad de Configuration Item.
- Asset.
- Relationships.
- Estado.
- Monitoring.
- Maintenance.
- Inventario.
- Hardware.
- Software.
- Auditoría.
- Historial.
- APIs.
- Servicios.
- Componentes frontend.
- Permisos.

Determinar cómo un dispositivo existente llega actualmente a CMDB.

Determinar si existe una relación:

Device → CMDB

o:

Asset → ConfigurationItem

o cualquier otra estructura equivalente.

UTILIZAR LA ESTRUCTURA REAL EXISTENTE.

NO crear una segunda CMDB.

NO crear una nueva entidad paralela solamente para impresoras.

---

## AUDITORÍA DEL AGENTE RMM

Analizar completamente el agente RMM existente.

Determinar:

- Lenguaje.
- Framework.
- Arquitectura.
- Entry point.
- Módulos.
- Collectors.
- Comunicación con backend.
- Autenticación.
- Jobs.
- Commands.
- Polling.
- WebSocket.
- HTTP.
- HTTPS.
- Sistema de actualización.
- Permisos.
- Servicios del sistema operativo.
- Manejo de errores.
- Logs.
- Configuración.

Identificar dónde debe incorporarse Network Discovery.

La funcionalidad debe incorporarse al agente existente.

NO crear otro agente.

NO crear otro servicio de agente.

NO duplicar el mecanismo actual de comunicación.

Si el agente ya dispone de un sistema de comandos remotos o jobs, reutilizarlo.

---

## AUDITORÍA DE LA BASE DE DATOS

Analizar el esquema real de base de datos.

Identificar estructuras relacionadas con:

- Devices.
- Assets.
- Computers.
- Printers.
- Agents.
- Organizations.
- Sites.
- CMDB.
- Configuration Items.
- Monitoring.
- Maintenance.
- Audit.
- Network.
- IP.
- MAC.
- Hardware.

Determinar si ya existen campos que puedan representar:

- IP.
- MAC.
- Manufacturer.
- Model.
- Serial Number.
- Hostname.
- Device Type.
- Status.
- Firmware.

NO crear tablas duplicadas.

Si ya existe una tabla de dispositivos, reutilizarla.

Si es necesario extenderla, hacerlo solamente después de determinar que realmente es necesario.

---

## AUDITORÍA DEL SISTEMA DE ORGANIZACIONES Y SEDES

La plataforma puede ser multiempresa/multiorganización.

Respetar completamente el modelo existente.

Network Discovery debe ejecutarse dentro del contexto de:

- Organización.
- Sede.
- Usuario.
- Agente.

No permitir que un usuario consulte dispositivos pertenecientes a otra organización si el sistema actual no lo permite.

Reutilizar los mecanismos existentes de autorización.

---

## AUDITORÍA DE PERMISOS

Determinar cómo funciona actualmente RBAC.

No crear un sistema de permisos paralelo.

Si existe un permiso para administrar dispositivos, evaluar si ese permiso puede cubrir Network Discovery.

Si realmente se necesita un permiso específico, integrarlo en el sistema existente.

Ejemplos conceptuales:

network_discovery.view
network_discovery.discover
network_discovery.register
network_discovery.manage

Estos nombres son solamente referencias.

Utilizar la nomenclatura real del proyecto.

---

## AUDITORÍA DEL FRONTEND

Analizar el diseño actual.

Identificar componentes reutilizables:

- Tables.
- Forms.
- Modals.
- Drawers.
- Cards.
- Badges.
- Filters.
- Buttons.
- Loading.
- Toast.
- Error states.
- Detail views.

NO crear una interfaz con un diseño visual diferente.

Network Discovery debe integrarse visualmente con el módulo DISPOSITIVOS existente.

No crear un sistema de diseño paralelo.

---

## AUDITORÍA DEL SISTEMA DE JOBS

Determinar si actualmente existe:

- Queue.
- Job.
- Worker.
- Task.
- Command.
- Background job.
- Agent command.

Si existe, reutilizarlo.

El descubrimiento de una IP no debe bloquear la interfaz del usuario.

El frontend debe crear una solicitud de descubrimiento y recibir posteriormente el resultado.

---

## AUDITORÍA DEL SISTEMA DE LOGS Y AUDITORÍA

Determinar cómo se registra actualmente:

- Acciones del usuario.
- Cambios de dispositivos.
- Cambios CMDB.
- Eventos del agente.
- Errores.

Reutilizar ese sistema.

No crear otro sistema de auditoría.

---

## AUDITORÍA DEL SISTEMA DE NOTIFICACIONES

Si ya existe un sistema de notificaciones, reutilizarlo.

No crear uno nuevo.

La implementación futura podrá generar eventos como:

- Nuevo dispositivo descubierto.
- Dispositivo actualizado.
- Dispositivo offline.
- Error de descubrimiento.
- Error de sincronización CMDB.

Pero solamente implementar estas notificaciones si la arquitectura actual ya soporta este tipo de eventos o si son necesarias para la funcionalidad.

---

# DESPUÉS DE LA AUDITORÍA

Una vez comprendido el proyecto, generar internamente un mapa de integración.

El IDE debe determinar:

1. Qué archivos existentes se reutilizarán.
2. Qué archivos existentes necesitan extensión.
3. Qué servicios existentes pueden utilizarse.
4. Qué APIs existentes pueden reutilizarse.
5. Qué entidades existentes representan dispositivos.
6. Qué entidades existentes representan CMDB.
7. Cómo se comunican actualmente los agentes.
8. Cómo se ejecutan actualmente los Jobs.
9. Qué componentes frontend pueden reutilizarse.
10. Qué modificaciones son estrictamente necesarias.

NO cambiar la arquitectura solamente para seguir este documento.

Este documento debe adaptarse al proyecto real.

---

# IMPLEMENTACIÓN

Después de la auditoría, implementar Network Discovery utilizando la arquitectura encontrada.

El sistema debe permitir que el administrador seleccione o indique:

- Organización.
- Sede.
- Agente RMM.
- Dirección IP.

Ejemplo:

Organización:
Empresa ABC

Sede:
Principal

Agente:
PC-ADMIN-01

IP:
10.0.5.56

Acción:

DETECTAR

---

# FLUJO DE EJECUCIÓN

Cuando el administrador solicite detectar una IP:

1. Validar autenticación.
2. Validar autorización.
3. Validar organización.
4. Validar sede.
5. Validar agente.
6. Validar formato de IP.
7. Verificar que el agente esté autorizado.
8. Crear una tarea de Discovery utilizando el mecanismo existente.
9. Enviar la tarea al agente.
10. El agente realiza la consulta desde la red local.
11. El agente recopila la información disponible.
12. El agente devuelve el resultado.
13. Backend normaliza el resultado.
14. Backend identifica el dispositivo.
15. Backend busca si ya existe.
16. Si existe, actualizar.
17. Si no existe, preparar registro.
18. Integrar con el módulo DISPOSITIVOS existente.
19. Integrar con CMDB utilizando el mecanismo existente.
20. Registrar auditoría.
21. Mostrar resultado al usuario.

---

# IMPORTANTE SOBRE LA RED

La IP:

10.0.5.56

normalmente pertenece a una red privada.

El backend desplegado en Internet no debe asumir que puede acceder directamente a esa IP.

El descubrimiento debe ejecutarse desde el agente RMM existente que tenga acceso a la red local.

Arquitectura conceptual:

Internet
   ↓
Backend RMM
   ↓
Agente RMM existente
   ↓
Red local
   ↓
10.0.5.56
   ↓
Impresora

No convertir el backend público en un scanner arbitrario.

---

# DESCUBRIMIENTO POR IP

La primera versión debe soportar una IP individual.

Ejemplo:

10.0.5.56

Debe validar IPv4.

La arquitectura debe quedar preparada para soportar posteriormente:

- Rangos.
- Subredes.
- CIDR.
- IPv6.

No implementar descubrimiento masivo si no es necesario para la primera versión.

---

# PROTOCOLOS DE DESCUBRIMIENTO

La implementación debe intentar utilizar protocolos apropiados según las capacidades del dispositivo y del sistema operativo del agente.

Prioridad sugerida:

1. SNMP.
2. eSCL/AirScan.
3. WSD.
4. HTTP.
5. HTTPS.
6. ICMP.

El IDE debe comprobar primero si alguna librería o implementación equivalente ya existe en el proyecto.

No incorporar dependencias innecesarias.

---

# SNMP

Si se utiliza SNMP:

Soportar inicialmente:

SNMP v1
SNMP v2c

Preparar arquitectura para SNMP v3.

NO almacenar credenciales o comunidades en:

- Frontend.
- Código fuente.
- Git.
- Logs.
- Mensajes visibles.

Si el proyecto ya posee un sistema seguro de secretos, utilizarlo.

Si no existe, evaluar una solución segura antes de implementar almacenamiento de credenciales.

---

# INFORMACIÓN DE IMPRESORAS

Cuando técnicamente sea posible, intentar obtener:

- IP.
- MAC.
- Hostname.
- Fabricante.
- Modelo.
- Número de serie.
- Firmware.
- Estado.
- Contadores.
- Consumibles.
- Capacidades.

La información depende de lo que el dispositivo exponga.

No asumir que todas las impresoras proporcionarán todos los datos.

---

# INFORMACIÓN DE ESCÁNERES

Cuando técnicamente sea posible, intentar obtener:

- IP.
- MAC.
- Hostname.
- Fabricante.
- Modelo.
- Número de serie.
- Firmware.
- Estado.
- Capacidades.

No asumir que todos los escáneres soportan los mismos protocolos.

---

# MULTIFUNCIONALES

Una impresora multifuncional debe registrarse como un único dispositivo físico.

Ejemplo:

HP E731

Si el dispositivo tiene:

- Impresión.
- Escaneo.
- Copia.

debe existir un único Device.

No crear:

HP E731 Printer

y:

HP E731 Scanner

como dos activos independientes.

El tipo debe ser equivalente a:

MULTIFUNCTION

si el modelo actual de Device soporta tipos.

Si el sistema actual utiliza otra nomenclatura, respetarla.

Las capacidades pueden representar:

printing
scanning
copying
fax

solamente cuando realmente se hayan detectado.

---

# IDENTIFICACIÓN DEL DISPOSITIVO

La IP NO debe ser la identidad primaria del dispositivo.

Intentar identificar mediante:

1. Número de serie.
2. MAC.
3. Identificador de fabricante.
4. Hostname.
5. IP.

Utilizar las estructuras actuales del sistema.

Si ya existe un mecanismo de deduplicación en Dispositivos, reutilizarlo.

---

# CAMBIO DE IP

Ejemplo:

Primera detección:

MAC:
AA:BB:CC:DD:EE:FF

IP:
10.0.5.56

Posteriormente:

MAC:
AA:BB:CC:DD:EE:FF

IP:
10.0.5.80

El sistema debe reconocer que se trata del mismo dispositivo cuando exista evidencia suficiente.

Debe actualizar la IP.

No crear otro dispositivo.

Registrar el cambio en el historial existente.

---

# DEDUPLICACIÓN

Antes de crear un nuevo dispositivo:

Buscar utilizando las estructuras existentes del proyecto.

Prioridad conceptual:

Serial
MAC
Vendor identifier
Hostname
IP

La búsqueda debe respetar el contexto de organización y sede según el modelo actual.

Si el dispositivo ya existe:

Actualizar.

Si no existe:

Crear utilizando la entidad existente.

No crear duplicados.

---

# FUENTE DEL DISPOSITIVO

El sistema debe poder identificar que el dispositivo fue detectado mediante Network Discovery.

Si el modelo actual soporta un campo de origen, utilizarlo.

Conceptualmente:

source = NETWORK_DISCOVERY

Si ya existe una estructura de origen diferente, utilizarla.

No agregar un nuevo campo si el sistema actual ya dispone de uno equivalente.

---

# INFORMACIÓN DE DESCUBRIMIENTO

Cuando la arquitectura existente lo permita, registrar:

- Fecha del descubrimiento.
- Último descubrimiento.
- Agente utilizado.
- IP consultada.
- Protocolo utilizado.
- Resultado.
- Estado.

Utilizar los campos existentes cuando sea posible.

---

# INFORMACIÓN PARCIAL

El dispositivo no debe descartarse simplemente porque no proporcione toda la información.

Ejemplo:

IP:
10.0.5.56

MAC:
AA:BB:CC:DD:EE:FF

Fabricante:
N/A

Modelo:
N/A

Esto puede representar un dispositivo parcialmente identificado.

No inventar información.

---

# NO INVENTAR INFORMACIÓN

El sistema nunca debe generar datos ficticios.

Si no se obtiene:

Modelo → NULL/N/A según el modelo existente.

Serial → NULL/N/A.

Firmware → NULL/N/A.

Consumibles → NULL/N/A.

Contadores → NULL/N/A.

Capacidades → desconocidas.

No utilizar cero como sustituto de un dato desconocido si semánticamente son valores diferentes.

---

# ESTADO DEL DISPOSITIVO

Utilizar el sistema de estados existente.

Si es necesario mapear conceptualmente:

ONLINE
OFFLINE
WARNING
ERROR
UNKNOWN

pero utilizar los estados reales del proyecto.

No crear un segundo sistema de estados.

---

# LAST SEEN

Si el sistema actual ya dispone de:

lastSeenAt

u otro campo equivalente, reutilizarlo.

Registrar cuándo fue visto por última vez.

---

# CONSUMIBLES

Cuando técnicamente sea posible obtener consumibles:

- Tóner negro.
- Tóner cyan.
- Tóner magenta.
- Tóner amarillo.
- Tambor.
- Fusor.
- Otros.

No crear una estructura nueva si ya existe una relacionada con consumibles.

Utilizar la estructura existente.

---

# CONTADORES

Cuando estén disponibles:

- Páginas totales.
- Páginas monocromáticas.
- Páginas color.
- Copias.
- Escaneos.
- Fax.

No inventar valores.

---

# FIRMWARE

Cuando esté disponible:

- Versión.
- Fecha de actualización si el dispositivo la proporciona.

Utilizar estructuras existentes si existen.

---

# DISPOSITIVOS

Después del descubrimiento, el activo debe integrarse con el módulo existente:

DISPOSITIVOS

Debe poder aparecer utilizando los mismos filtros, detalle técnico, acciones y trazabilidad que los demás dispositivos soportados actualmente.

No crear un inventario independiente para impresoras.

No crear una pantalla completamente separada que replique el inventario.

Si es necesario agregar una opción:

Network Discovery

debe integrarse dentro de la navegación existente de DISPOSITIVOS.

---

# CMDB

Después de que el dispositivo haya sido creado o actualizado en la estructura existente de DISPOSITIVOS, debe integrarse con la CMDB existente siguiendo exactamente el flujo actual del proyecto.

Si existe un servicio que sincroniza Device → CMDB, reutilizarlo.

Si existe un proceso automático, utilizarlo.

Si existe una relación entre Device y Configuration Item, utilizarla.

No crear una nueva CMDB.

No crear un segundo Configuration Item si ya existe uno.

---

# REGLA DE SINCRONIZACIÓN

La lógica conceptual será:

DESCUBRIMIENTO
↓
DISPOSITIVO EXISTENTE O NUEVO
↓
CMDB EXISTENTE

Pero la implementación debe utilizar los servicios y relaciones reales del proyecto.

---

# SI CMDB FALLA

Si el dispositivo se registra correctamente pero falla la sincronización con CMDB:

NO eliminar el dispositivo.

NO volver a crearlo.

NO duplicarlo.

Utilizar el mecanismo actual de errores/reintentos.

Si el sistema actual soporta estados de sincronización, utilizarlos.

Si no existe, implementar solamente lo estrictamente necesario.

---

# HISTORIAL

El descubrimiento debe integrarse con el historial existente del dispositivo.

Registrar, si el sistema ya lo soporta:

- Discovery ejecutado.
- Dispositivo detectado.
- Dispositivo creado.
- Dispositivo actualizado.
- IP modificada.
- Estado modificado.
- CMDB sincronizada.
- Error de sincronización.

No crear un segundo historial independiente.

---

# AUDITORÍA

Utilizar el sistema actual de auditoría.

Debe ser posible determinar:

- Usuario que ejecutó el Discovery.
- Organización.
- Sede.
- Agente.
- IP.
- Fecha.
- Resultado.
- Dispositivo afectado.
- Acción realizada.

No guardar secretos en logs.

---

# SEGURIDAD

La implementación debe respetar las medidas de seguridad existentes.

Validar:

- Usuario autenticado.
- Permisos.
- Organización.
- Sede.
- Agente.
- IP.

Evitar que el backend pueda utilizarse como mecanismo arbitrario para consultar redes privadas.

El acceso a la red debe realizarse mediante un agente RMM autorizado.

---

# TIMEOUT

Utilizar los timeouts existentes si ya están definidos.

Si no existen, establecer valores razonables y configurables.

No bloquear indefinidamente esperando una respuesta.

---

# RETRIES

Utilizar el sistema existente de reintentos si existe.

Si no existe, implementar un número limitado de reintentos.

Nunca utilizar ciclos infinitos.

---

# ERRORES

El sistema debe distinguir, cuando sea posible:

- IP inválida.
- Sin respuesta.
- Timeout.
- Error de red.
- Protocolo no soportado.
- Error de autenticación.
- Error del agente.
- Error interno.
- Dispositivo no identificado.

Utilizar el sistema de errores existente.

---

# FRONTEND

Integrar la funcionalidad en el módulo DISPOSITIVOS existente.

La interfaz debe utilizar los componentes actuales.

El flujo visual conceptual puede ser:

DISPOSITIVOS
→ NETWORK DISCOVERY
→ Organización
→ Sede
→ Agente
→ IP
→ DETECTAR

Durante la ejecución:

"Consultando agente..."

"Consultando dispositivo..."

"Analizando respuesta..."

"Procesando información..."

Al finalizar:

"Dispositivo detectado"

o:

"No fue posible identificar el dispositivo"

---

# RESULTADO DE DETECCIÓN

Cuando se detecte una impresora:

Fabricante:
HP

Modelo:
E731

IP:
10.0.5.56

MAC:
AA:BB:CC:DD:EE:FF

Tipo:
MULTIFUNCTION

Estado:
ONLINE

Capacidades:
Impresión
Escaneo
Copia

Los datos mostrados deben corresponder exclusivamente a información realmente obtenida.

---

# DISPOSITIVO EXISTENTE

Si ya existe:

Mostrar que el dispositivo ya está registrado.

Permitir utilizar el flujo actual del módulo DISPOSITIVOS para:

- Ver.
- Actualizar.
- Consultar detalle.

No crear duplicado.

---

# DISPOSITIVO NUEVO

Si no existe:

Utilizar el mecanismo existente de alta de dispositivos.

Si existe una confirmación antes de crear dispositivos, respetarla.

No introducir registro automático irreversible sin analizar primero el comportamiento actual del sistema.

---

# AUTO-REGISTRO

La primera versión debe priorizar seguridad y control administrativo.

Conceptualmente:

DETECTAR
→ MOSTRAR RESULTADO
→ CONFIRMAR
→ REGISTRAR

No activar auto-registro masivo sin autorización explícita.

---

# DESCUBRIMIENTO MASIVO

La primera versión debe priorizar IP individual.

Sin embargo, la arquitectura debe quedar preparada para posteriormente soportar:

- Lista de IP.
- Rango.
- Subred.
- CIDR.
- Discovery programado.

Ejemplo futuro:

10.0.5.0/24

El descubrimiento masivo deberá utilizar Jobs/Queues y límites de concurrencia.

No implementar escaneo masivo si no es necesario para la primera versión.

---

# LISTA DE IP RESERVADAS

La plataforma debe quedar preparada para recibir una lista de IP reservadas.

Ejemplo:

10.0.5.56
10.0.5.57
10.0.5.58
10.0.5.59

Cada dirección puede convertirse en una tarea independiente utilizando el sistema existente de Jobs.

---

# IMPORTACIÓN

Preparar arquitectura futura para:

CSV
XLSX
TXT

No es obligatorio implementar importación en la primera versión si no existe infraestructura adecuada.

---

# PROGRAMACIÓN

Preparar la arquitectura para Discovery programado.

Ejemplo futuro:

Cada 6 horas.
Cada 12 horas.
Diariamente.
Semanalmente.

No es obligatorio implementar Scheduler en la primera versión si la plataforma todavía no lo requiere.

---

# DISPOSITIVOS OFFLINE

Si un dispositivo ya registrado deja de responder:

No eliminarlo.

No crear otro.

Actualizar el estado utilizando el sistema existente.

Mantener:

- Historial.
- CMDB.
- Mantenimiento.
- Relaciones.
- Información histórica.

---

# ESCALABILIDAD

La implementación debe quedar preparada para incorporar posteriormente:

- Switches.
- Routers.
- Firewalls.
- Access Points.
- UPS.
- NAS.
- Cámaras.
- IoT.
- Otros dispositivos de red.

No es obligatorio implementar estos tipos ahora.

La arquitectura debe permitir agregar nuevos Providers sin rehacer el sistema completo.

---

# ARQUITECTURA DE PROVIDERS

Si la arquitectura del proyecto lo permite, implementar una abstracción equivalente a:

NetworkDiscoveryProvider

con proveedores como:

SNMP
eSCL
WSD
HTTP
HTTPS
ICMP

Pero NO imponer esta estructura si el proyecto utiliza otra arquitectura equivalente.

La regla es:

ADAPTARSE AL PROYECTO EXISTENTE.

---

# NORMALIZACIÓN

Todos los resultados de descubrimiento deben terminar en una estructura común antes de integrarse con DISPOSITIVOS.

Conceptualmente:

IP
MAC
Hostname
Manufacturer
Model
Serial
Firmware
Type
Status
Capabilities
Consumables
Counters

Esta estructura es conceptual.

Utilizar los DTOs, interfaces, schemas o modelos existentes si ya existen.

---

# DEDUPLICACIÓN E IDEMPOTENCIA

Ejecutar varias veces:

Detectar 10.0.5.56

no debe producir:

HP E731 #1
HP E731 #2
HP E731 #3

Debe mantener un único activo.

La operación debe ser idempotente.

---

# CAMBIOS DE INFORMACIÓN

Si cambia:

IP
Hostname
Firmware
Estado
Consumibles
Contadores

el sistema debe actualizar el dispositivo existente cuando corresponda.

Debe conservar historial cuando la plataforma actual lo permita.

---

# RENDIMIENTO

No realizar consultas innecesarias.

Utilizar:

- Jobs.
- Queues.
- Cache cuando sea apropiado.
- Límites de concurrencia.

No bloquear la interfaz.

---

# OBSERVABILIDAD

El sistema debe permitir identificar:

- Qué agente realizó el descubrimiento.
- Qué IP se consultó.
- Cuándo se consultó.
- Qué protocolo funcionó.
- Cuánto tardó.
- Qué información fue obtenida.
- Qué información no estuvo disponible.
- Si se creó dispositivo.
- Si se actualizó dispositivo.
- Si se sincronizó CMDB.
- Si ocurrió un error.

Utilizar los mecanismos de observabilidad existentes.

---

# MÉTRICAS

Si el sistema actual dispone de métricas, agregar:

- Discovery attempts.
- Discovery success.
- Discovery failures.
- Devices discovered.
- Devices created.
- Devices updated.
- Duplicates detected.
- CMDB synchronization errors.
- Average discovery time.

No crear un sistema de métricas paralelo.

---

# PRUEBAS

Antes de finalizar, crear o adaptar pruebas utilizando el framework existente.

Probar como mínimo:

1. IP válida.
2. IP inválida.
3. Agente disponible.
4. Agente no disponible.
5. Dispositivo online.
6. Dispositivo offline.
7. Impresora.
8. Escáner.
9. Multifuncional.
10. Información parcial.
11. Dispositivo existente.
12. Dispositivo nuevo.
13. Duplicación.
14. Cambio de IP.
15. Error de protocolo.
16. Timeout.
17. Error del agente.
18. Sincronización CMDB.
19. Error CMDB.
20. Permisos.
21. Multi-tenant.

---

# PRUEBA PRINCIPAL

Utilizar una impresora de red configurada con:

IP:

10.0.5.56

Ejecutar:

Network Discovery

El agente debe intentar identificar el dispositivo.

Si el dispositivo proporciona:

Fabricante:
HP

Modelo:
E731

debe devolver esos datos.

Si proporciona además:

MAC
Serial
Firmware
Estado
Capacidades
Consumibles
Contadores

deben procesarse.

Si no proporciona alguno:

no inventarlo.

---

# PRUEBA DE DUPLICACIÓN

Detectar:

10.0.5.56

Registrar.

Volver a detectar:

10.0.5.56

Resultado esperado:

Un solo Device.

Un solo Configuration Item si esa es la relación existente en CMDB.

Información actualizada.

Sin duplicación.

---

# PRUEBA DE CAMBIO DE IP

Detectar:

MAC:
AA:BB:CC:DD:EE:FF

IP:
10.0.5.56

Posteriormente:

MAC:
AA:BB:CC:DD:EE:FF

IP:
10.0.5.80

Resultado esperado:

Mismo dispositivo.

Nueva IP.

Historial actualizado.

No crear duplicado.

---

# PRUEBA DE ESCÁNER

Consultar una IP correspondiente a un escáner compatible.

El sistema debe identificarlo cuando técnicamente sea posible.

Tipo:

SCANNER

Si el escáner forma parte de un multifuncional:

MULTIFUNCTION

No registrar dos activos físicos para un mismo equipo multifuncional.

---

# PRUEBA DE MULTIFUNCIONAL

Consultar un dispositivo multifuncional.

Resultado:

Un solo Device.

Debe reflejar sus capacidades cuando sean detectadas.

Ejemplo conceptual:

Impresión: Sí
Escaneo: Sí
Copia: Sí
Fax: desconocido

---

# PRUEBA DE INFORMACIÓN PARCIAL

Si únicamente se obtiene:

IP:
10.0.5.56

MAC:
AA:BB:CC:DD:EE:FF

el sistema debe poder manejar el resultado sin inventar:

Fabricante.
Modelo.
Serial.
Firmware.

---

# PRUEBA CMDB

Después del registro del Device:

Verificar que se siga el flujo actual de integración con CMDB.

No crear un Configuration Item paralelo si el sistema actual ya tiene uno.

---

# PRUEBA DE SEGURIDAD

Verificar que un usuario no pueda ejecutar Network Discovery sobre una organización o sede que no tiene autorizada.

Verificar que la IP sea procesada por el agente autorizado.

Verificar que el backend no se convierta en un mecanismo de acceso arbitrario a redes privadas.

---

# PRUEBA DE REGRESIÓN

MUY IMPORTANTE:

Después de implementar Network Discovery, verificar que los computadores que actualmente detecta el agente sigan funcionando exactamente como antes.

No modificar:

- Recolección de hardware.
- Recolección de software.
- Registro de computadores.
- Actualización de computadores.
- Comunicación existente del agente.
- Inventario actual.
- CMDB actual.

salvo que la auditoría determine que una modificación es estrictamente necesaria y compatible.

---

# CRITERIO DE COMPATIBILIDAD

La implementación será considerada correcta únicamente si:

- El sistema actual sigue funcionando.
- Los computadores continúan siendo detectados.
- El agente actual continúa funcionando.
- DISPOSITIVOS continúa funcionando.
- CMDB continúa funcionando.
- Las relaciones existentes no se rompen.
- No se crean inventarios duplicados.
- No se crean CMDB paralelas.
- No se crean agentes adicionales.
- No se crean estructuras innecesarias.
- Los dispositivos descubiertos pueden integrarse con el modelo actual.

---

# REGLA SOBRE MODIFICACIONES

No modificar los módulos DISPOSITIVOS y CMDB simplemente porque este documento lo indique.

Primero analizar cómo están construidos.

Después determinar si necesitan:

- Ninguna modificación.
- Una extensión mínima.
- Un nuevo campo.
- Un nuevo tipo.
- Una nueva relación.
- Un nuevo endpoint.
- Un nuevo componente.

Solo realizar la modificación estrictamente necesaria.

Si DISPOSITIVOS ya puede representar una impresora sin cambios estructurales, utilizarlo tal como está.

Si CMDB ya puede representar una impresora como Configuration Item, utilizarla tal como está.

Si ya existen campos para IP, MAC, fabricante, modelo y serial, reutilizarlos.

Si ya existe un sistema de tipos de dispositivo, agregar PRINTER/SCANNER/MULTIFUNCTION únicamente si realmente es necesario y siguiendo la estructura existente.

---

# REGLA DE NO REGRESIÓN

No eliminar funcionalidad existente.

No renombrar módulos.

No cambiar nombres visibles.

No cambiar rutas públicas sin necesidad.

No cambiar APIs existentes sin compatibilidad.

No cambiar esquemas existentes de manera destructiva.

No eliminar tablas.

No eliminar columnas.

No eliminar relaciones.

No reemplazar servicios existentes por nuevos sin justificarlo.

---

# REGLA DE DEPENDENCIAS

Antes de instalar una dependencia nueva:

1. Revisar package.json o equivalente.
2. Verificar si existe una librería que ya permita la funcionalidad.
3. Evaluar compatibilidad.
4. Evaluar seguridad.
5. Evaluar mantenimiento.
6. Evaluar tamaño.
7. Instalar solamente si es necesario.

No agregar dependencias innecesarias.

---

# REGLA DE DOCUMENTACIÓN

Después de la implementación actualizar la documentación técnica existente del proyecto si corresponde.

Documentar:

- Cómo funciona Network Discovery.
- Cómo utiliza el agente.
- Qué protocolos soporta.
- Cómo se integra con DISPOSITIVOS.
- Cómo se integra con CMDB.
- Cómo se deduplican dispositivos.
- Cómo se manejan cambios de IP.
- Cómo se manejan errores.
- Cómo probarlo.

No crear documentación duplicada si ya existe una ubicación apropiada.

---

# RESULTADO FINAL ESPERADO

El administrador debe poder abrir el módulo existente:

DISPOSITIVOS

y desde allí utilizar una funcionalidad integrada de:

NETWORK DISCOVERY

Introducir:

Organización
Sede
Agente
IP

Por ejemplo:

10.0.5.56

Presionar:

DETECTAR

El agente RMM existente consulta la IP desde la red local.

El sistema identifica, cuando sea técnicamente posible:

HP
E731
10.0.5.56
MAC
Serial
Firmware
Estado
Capacidades
Consumibles
Contadores

Posteriormente:

DISCOVERY
↓
DEVICE EXISTENTE O NUEVO
↓
CMDB EXISTENTE

El dispositivo queda visible dentro del módulo existente:

DISPOSITIVOS

y puede ser gestionado por las capacidades existentes de:

- Filtros.
- Edición.
- Detalle técnico.
- Acciones rápidas.
- Trazabilidad.

También debe quedar integrado en:

CMDB

para utilizar las capacidades existentes de:

- Inventario.
- Monitoreo.
- Relaciones.
- Mantenimiento.
- Trazabilidad.

---

# PRINCIPIO FINAL DE IMPLEMENTACIÓN

ESTE DOCUMENTO NO ORDENA REESTRUCTURAR LA PLATAFORMA.

ESTE DOCUMENTO ORDENA EXTENDER LA PLATAFORMA EXISTENTE DE LA FORMA MENOS INVASIVA POSIBLE.

La prioridad absoluta es conservar la arquitectura existente.

El IDE debe trabajar sobre lo que ya existe.

La estrategia obligatoria es:

1. AUDITAR.
2. MAPEAR.
3. IDENTIFICAR ESTRUCTURAS REUTILIZABLES.
4. IDENTIFICAR PUNTOS DE EXTENSIÓN.
5. IMPLEMENTAR NETWORK DISCOVERY.
6. INTEGRAR CON EL DEVICE EXISTENTE.
7. INTEGRAR CON CMDB EXISTENTE.
8. PROBAR.
9. VALIDAR NO REGRESIÓN.
10. DOCUMENTAR.

NO asumir.

NO reemplazar.

NO duplicar.

NO reconstruir.

NO modificar innecesariamente.

NO crear módulos paralelos.

NO crear otro agente.

NO crear otro inventario.

NO crear otra CMDB.

NO alterar el funcionamiento actual del RMM.

La implementación debe parecer una funcionalidad nativa que siempre hubiera formado parte de la plataforma.

---

# ORDEN FINAL PARA EL IDE

Ejecuta este documento como una única tarea de ingeniería.

PRIMERO realiza una auditoría completa del repositorio y determina la arquitectura real.

SEGUNDO identifica exactamente cómo funcionan actualmente los módulos DISPOSITIVOS y CMDB y cómo se relacionan con el agente RMM.

TERCERO identifica las estructuras que pueden reutilizarse.

CUARTO presenta internamente el plan de integración basado en la arquitectura encontrada.

QUINTO implementa Network Discovery adaptándolo a dicha arquitectura.

SEXTO integra los dispositivos descubiertos con el módulo DISPOSITIVOS existente.

SÉPTIMO integra los dispositivos con la CMDB existente utilizando sus estructuras actuales.

OCTAVO implementa detección de impresoras, escáneres y multifuncionales mediante el agente RMM existente.

NOVENO implementa deduplicación e identificación de dispositivos.

DÉCIMO implementa manejo de cambios de IP.

DÉCIMO PRIMERO implementa manejo de errores, auditoría y trazabilidad utilizando los sistemas existentes.

DÉCIMO SEGUNDO ejecuta pruebas unitarias, integración y regresión.

DÉCIMO TERCERO verifica que los computadores actualmente administrados por el agente sigan funcionando sin cambios.

DÉCIMO CUARTO verifica que DISPOSITIVOS siga funcionando.

DÉCIMO QUINTO verifica que CMDB siga funcionando.

DÉCIMO SEXTO documenta únicamente los cambios realizados.

SI DURANTE LA AUDITORÍA SE DETERMINA QUE UNA PARTE DE ESTE DOCUMENTO NO ES COMPATIBLE CON LA ARQUITECTURA REAL DEL PROYECTO, NO REESTRUCTURES EL PROYECTO PARA FORZAR ESTE DOCUMENTO.

ADAPTA LA IMPLEMENTACIÓN A LA ARQUITECTURA REAL EXISTENTE.

LA ARQUITECTURA EXISTENTE TIENE PRIORIDAD.

LA FUNCIONALIDAD NUEVA DEBE ADAPTARSE A ELLA.

FIN DE LA ORDEN.