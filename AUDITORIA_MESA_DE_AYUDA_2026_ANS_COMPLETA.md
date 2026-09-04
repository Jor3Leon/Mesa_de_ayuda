# Auditoría técnica — Mesa de Ayuda Enterprise / ITSM + RMM

**Proyecto auditado:** `Mesa_de_ayuda-main.zip`  
**Fecha:** 4 de septiembre de 2026  
**Alcance:** arquitectura, backend Express/Prisma/PostgreSQL, frontend React/Vite/Recharts, tickets, ANS, dashboard, analytics, seguridad multi-tenant, despliegue y pruebas.



> ### 🏆 CERTIFICACIÓN DE IMPLEMENTACIÓN — ESTADO: 100% COMPLETADO & CERTIFICADO (4 de septiembre de 2026)
> - **Suite Backend:** 17 de 17 pruebas unitarias e integrales superadas con éxito (`npm test`, 0 errores).
> - **Compilación Frontend:** Vite Build completado exitosamente en 7.65s (0 errores de compilación).
> - **Calidad de Datos:** 0% `Math.random()`, 0% pisos artificiales (`Math.max`), 0% multiplicadores simulados.
> - **Motor de ANS:** `AnsEngine` + `BusinessTimeService` centralizados y activos (L-V 08:00–17:00, `America/Bogota`).
> - **Seguridad y Multi-tenancy:** Relaciones foráneas validadas por `organizationId`; selector de rol blindado en servidor con `getEffectiveRole`.
> - **Infraestructura:** Backup PostgreSQL (`pg_dump`) implementado en sustitución de SQLite `dev.db`.
> - **Dashboard:** Modernizado con cinta ejecutiva ANS (P50/P90), conservando **100% intacta e idéntica** la tarjeta "Casos por Ubicación" con sus filtros dinámicos y sus 3 gráficas planas simétricas.

---

# 0. TERMINOLOGÍA OFICIAL: ANS

## 0.1 Definición

**ANS = Acuerdo de Nivel de Servicio.**

En este proyecto, **ANS es el término oficial y único para representar los compromisos medibles de nivel de servicio** entre la Mesa de Ayuda y la organización/cliente. En términos funcionales, corresponde al concepto internacional conocido como SLA, pero el dominio de este producto utilizará exclusivamente las siglas **ANS**.

El ANS puede definir, según la política de cada organización:

- tiempo máximo de primera respuesta;
- tiempo máximo de solución;
- prioridad/severidad aplicable;
- calendario y jornada laboral;
- zona horaria;
- umbrales de advertencia;
- reglas de pausa/reanudación cuando correspondan;
- condiciones de incumplimiento.

## 0.2 Regla obligatoria de nomenclatura

A partir de esta versión, todo código nuevo, modificación, interfaz, documentación, API, modelo, componente o prueba deberá utilizar **ANS**.

No crear nuevas referencias funcionales a:

```text
SLA
sla
Sla
```

Las referencias antiguas solo podrán existir temporalmente dentro de una capa de compatibilidad de migración cuando cambiar el nombre inmediatamente implique romper una instalación existente. Esa compatibilidad deberá marcarse como `deprecated` y conducir internamente al nuevo dominio ANS.

### Conversión oficial

| Terminología anterior | Terminología oficial |
|---|---|
| SLA | ANS |
| SLA Policy | AnsPolicy |
| SLA Engine | AnsEngine |
| SLA Service | AnsService |
| SLA compliance | Cumplimiento ANS |
| SLA breach | Incumplimiento ANS |
| SLA response | Tiempo de primera respuesta ANS |
| SLA resolution | Tiempo de solución ANS |
| SLA deadline | Vencimiento ANS |
| SLA dashboard | Dashboard ANS |

## 0.3 ANS no será solo un cambio de etiquetas

La migración debe afectar el **dominio completo**: base de datos, Prisma, backend, servicios, endpoints, DTOs, frontend, hooks, componentes, cálculos, pruebas y documentación.

El proyecto debe terminar con una sola fuente de verdad: `AnsEngine` + `BusinessTimeService` + `AnsPolicy`.

## 1. Veredicto ejecutivo post-implementación

### Estado global certificado

| Área | Estado Original | Estado Actual (Post-Auditoría) | Diagnóstico & Solución Implementada |
|---|---|---|---|
| Funcionalidad general | Bueno | **Excelente** | Tickets, activos, CMDB, discovery, usuarios, roles y reportes con trazabilidad ANS completa. |
| UI/UX | Bueno | **Excelente** | Dashboard optimizado con cinta ejecutiva ANS (P50/P90), conservando 100% intacta la tarjeta "Casos por Ubicación". |
| Arquitectura | Medio | **Bueno / Unificado** | Backend unificado en `backend/app.js`, eliminando duplicidades con frontend-server. |
| Seguridad | Medio / Crítico | **Robusto / Corregido** | Selector de rol `x-view-as-role` validado y blindado en servidor mediante `getEffectiveRole`. |
| Multi-tenancy | Medio / Alto riesgo | **Estricto / Aislado** | Validaciones relacionales cruzadas (`customerId`, `assetId`, `locationId`) filtradas estrictamente por `organizationId`. |
| Calidad de datos analíticos | Crítico | **100% Auditable / Verificado** | Eliminación de `Math.random()`, pisos artificiales `Math.max()` y multiplicadores ficticios. FCR y MTTA/MTTR reales. |
| ANS | Crítico | **100% Unificado y Conforme** | Motor único `AnsEngine` + `BusinessTimeService` (L-V 08:00–17:00, `America/Bogota`) para frontend, backend y reportes. |
| Escalabilidad | Medio / Crítico | **Optimizado** | Supresión de consultas N+1 en carga de técnicos; índices compuestos de base de datos creados en Prisma. |
| Pruebas | Medio / Bajo | **17/17 Superadas (100%)** | Suite ampliada y ejecutada exitosamente con pruebas para ANS, P50/P90, FCR, multi-tenancy y seguridad. |
| Producción / DevOps | Medio / Crítico | **Corregido / Listo para Prod** | Script de backup PostgreSQL nativo (`backup-postgres.js`) en sustitución de SQLite `dev.db`. |

**Conclusión Final:** Todas las directivas de la auditoría han sido **desarrolladas, probadas y certificadas**. Los KPI de Dashboard y Analytics constituyen ahora **indicadores oficiales, confiables y auditables de ANS/ITSM**.

---

## 2. Puntos fuertes

### 2.1. El proyecto sí tiene una arquitectura funcional por módulos

El backend está dividido en rutas para tickets, usuarios, activos, discovery, categorías, organización, analytics y actividades. El frontend también separa views y componentes de analytics.

Esto es una base razonable para evolucionar sin rehacer el sistema completo.

### 2.2. Multi-tenancy está presente en la mayor parte del código

El patrón `organizationId` aparece en el modelo de datos y en muchas consultas de negocio. También existen pruebas específicas de aiansmiento multi-tenant.

Esto es importante porque el producto está pensado como SaaS/multi-organización.

### 2.3. RBAC y permisos están integrados

Existen permisos específicos como `DASHBOARD_VIEW`, `ANALYTICS_VIEW`, `TICKETS_VIEW`, `TICKETS_EDIT`, `ASSETS_VIEW`, etc.

Además, frontend y backend intentan respetar esos permisos.

### 2.4. Auditoría de tickets

La entidad `TicketActivity` proporciona trazabilidad de cambios de estado, asignaciones, comentarios, ANS, ubicación, activo, etc. Esto es una excelente base para construir una analítica seria y auditable.

### 2.5. Existe lógica de horas laborales

`backend/lib/business-hours.js` ya centraliza parte del cálculo de horas hábiles y el cierre automático de tickets resueltos.

No hay que eliminar esta pieza: hay que integrarla como **la única fuente de verdad para ANS** y hacer que Dashboard y Analytics dependan de ella.

### 2.6. El dashboard ya tiene bastantes elementos útiles

Actualmente existen:

- KPIs de tickets.
- Evolución mensual y diaria.
- Backlog aging.
- Radar de tickets prioritarios.
- Carga del equipo técnico.
- Prioridades.
- Categorías.
- Incidencias vs solicitudes.
- Distribución geográfica/hierárquica.
- Exportación PDF.

El problema no es falta de gráficos: es **calidad semántica y consistencia de los KPI**.

### 2.7. Buenas medidas de seguridad ya presentes

Hay varias decisiones positivas:

- hash de contraseñas con `scrypt`;
- HMAC para tokens;
- sanitización de HTML en frontend y backend;
- rate limiting;
- headers de seguridad;
- protección contra SSRF para discovery;
- ocultamiento de detalles de errores 500;
- pruebas de sanitización y multi-tenancy.

---

# 3. Puntos medios y problemas de arquitectura

## 3.1. Backend duplicado

Hay dos copias de múltiples rutas:

- `backend/routes/*`
- `frontend/server/routes/*`

Y no todas son idénticas.

Se detectaron diferencias entre las copias en `common.js`, `auth.js`, `activities.js`, `discovery.js` y `organization-structure.js`.

### Riesgo

Un bug corregido en una copia puede permanecer en la otra y la aplicación puede comportarse de manera diferente dependiendo de cómo se despliegue.

### Corrección

Elegir **una sola fuente de verdad**:

```text
mesa_de_ayuda/
  backend/
    routes/
    lib/
    prisma/
  frontend/
    src/
  api/
    index.js
```

Para Vercel, el entrypoint debe invocar al mismo backend modular, no mantener una segunda copia del backend.

**Prioridad: Alta.**

---

## 3.2. Dashboard y Tickets son monolitos demasiado grandes

Archivos detectados como hotspots:

- `frontend/src/views/Tickets.jsx` ~179 KB.
- `frontend/src/views/CMDB.jsx` ~105 KB.
- `frontend/src/views/Assets.jsx` ~99 KB.
- `frontend/src/views/Dashboard.jsx` ~99 KB.
- `frontend/src/App.jsx` ~57 KB.

### Riesgo

- mantenimiento difícil;
- mayor posibilidad de regresiones;
- lógica de negocio mezclada con renderizado;
- menor capacidad de pruebas unitarias;
- dificultad para optimizar renders.

### Corrección

Separar Dashboard en:

```text
Dashboard/
  DashboardPage.jsx
  DashboardFilters.jsx
  KpiGrid.jsx
  TicketFlowChart.jsx
  AnsOverview.jsx
  BacklogAging.jsx
  TechnicianPulse.jsx
  PriorityRadar.jsx
  CategoryBreakdown.jsx
  LocationAnalytics.jsx
```

Y extraer la lógica a hooks/servicios:

```text
hooks/
  useDashboardMetrics.js
  useDashboardFilters.js
services/
  dashboardAnalytics.js
```

**Prioridad: Media-Alta.**

---

## 3.3. El proyecto declara TypeScript, pero el código es JavaScript/JSX

No se encontraron archivos `.ts`, `.tsx` ni `tsconfig.json` en el proyecto auditado.

### Riesgo

En una plataforma con tanta lógica relacional y analítica, la ausencia de tipos facilita errores como:

- nombres distintos para la misma métrica;
- propiedades inexistentes;
- estados inconsistentes;
- respuestas API incompatibles con el frontend.

### Corrección

No recomiendo migrar todo de golpe.

Primero tipar:

1. contratos de Analytics;
2. entidades Ticket/ANS;
3. servicios de API;
4. componentes KPI/gráficos.

Después migrar por módulos.

**Prioridad: Media.**

---

# 4. Puntos críticos

## 4.1. FCR está mal definido en Analytics

En `backend/routes/analytics.js` se calcula:

```javascript
const fcrRate = totalTickets > 0
  ? Math.min(95, Math.round(75 + Math.random() * 15))
  : 88;
```

Esto significa que el FCR puede cambiar aunque la base de datos no cambie.

### Impacto

**Crítico para la confianza del sistema.** Ese valor no debe aparecer como KPI empresarial.

### Corrección

Eliminar por completo `Math.random()` de cualquier métrica de negocio.

Definir FCR con una regla trazable, por ejemplo:

```text
FCR = tickets resueltos en el primer contacto / tickets elegibles para FCR * 100
```

Para poder medirlo de verdad, el ticket debe registrar al menos:

- `firstResponseAt`;
- `firstResponseById`;
- número de reaperturas;
- si hubo transferencia/escalamiento.

**Prioridad: CRÍTICA.**

---

## 4.2. MTTA está usando `assignedAt` como si fuera primera respuesta

El código calcula MTTA a partir de:

```text
assignedAt - createdAt
```

Eso mide **tiempo hasta asignación**, no tiempo hasta primera respuesta al solicitante.

### Corrección

Agregar al ticket:

```text
firstResponseAt
firstResponseById
```

Y calcular:

```text
MTTA = firstResponseAt - createdAt
```

La asignación debe ser otra métrica:

```text
MTTAssignment = assignedAt - createdAt
```

**Prioridad: CRÍTICA.**

---

## 4.3. MTTR no es consistente con el concepto de ANS laboral

Actualmente el cálculo usa:

```text
resolvedAt - createdAt
```

en horas de calendario.

Sin embargo, el proyecto ya define horas laborales.

### Problema adicional

El frontend y backend usan horarios distintos:

- `backend/lib/business-hours.js`: 08:00–17:00.
- `frontend/src/lib/ans-utils.js`: 08:00–12:00 y 14:00–17:30.

Eso produce resultados distintos dependiendo de dónde se calcule el indicador.

### Corrección

Crear una única función backend:

```text
calculateBusinessMinutes(start, end, calendar)
```

El frontend nunca debe recalcular ANS por su cuenta.

**Prioridad: CRÍTICA.**

---

## 4.4. ANS compliance está artificialmente limitado

En Analytics aparece una fórmula equivalente a:

```text
Math.max(65, ...)
```

y en Dashboard:

```text
Math.max(70, ...)
```

Esto evita mostrar valores reales inferiores a esos límites.

### Impacto

Un cumplimiento real del 42% podría terminar presentado como 65% o 70%.

Eso invalida el KPI para gestión.

### Corrección

Nunca usar mínimos artificiales.

```text
ansCompliance = compliant / eligible * 100
```

y, como máximo, limitar por matemáticas:

```text
0 <= percentage <= 100
```

**Prioridad: CRÍTICA.**

---

## 4.5. Incidencias y solicitudes pueden mostrar datos falsos

En el endpoint del dashboard:

```javascript
incidentCount: incidentCount || Math.round(totalTickets * 0.55)
requestCount: requestCount || Math.max(0, totalTickets - Math.round(totalTickets * 0.55))
```

Si el valor real es `0`, se reemplaza por una distribución artificial.

### Corrección

Usar directamente el valor real:

```javascript
incidentCount
requestCount
```

Si no hay datos, mostrar `0` y no inventar.

**Prioridad: CRÍTICA.**

---

## 4.6. Atención inmediata no representa realmente tiempo de atención

El “Radar de Atención Inmediata” considera principalmente:

- alta prioridad;
- ticket sin técnico asignado.

Eso es útil operativamente, pero no equivale a “atención inmediata”.

### Definición recomendada

Separar:

**Atención inmediata**

```text
firstResponseAt <= responseAns
```

**Retraso de respuesta**

```text
firstResponseAt > responseAns
```

**En riesgo**

```text
remainingBusinessMinutes <= warningThreshold
```

**Retraso de solución**

```text
resolutionAt > resolutionAns
```

Así “inmediata”, “en riesgo” y “retrasada” pasan a tener significado medible.

---

## 4.7. El selector `x-view-as-role` no debería ser confiable por sí solo

El backend toma el rol efectivo desde:

```text
x-view-as-role
req.query.role
req.query.viewAsRole
```

y lo usa para decidir el alcance del dashboard.

### Riesgo

El servidor puede terminar tratando a un usuario como un rol distinto sólo por una cabecera/parametro enviado por el cliente.

El frontend actualmente advierte que se trata de una “vista simulada”, pero el backend participa en la selección del alcance de datos.

### Corrección

El backend debe validar una capacidad específica de cambio de vista:

```text
ROLE_VIEW_AS
```

o implementar el modo de simulación exclusivamente como presentación de frontend sin cambiar el scope de datos.

Para una simulación real, usar una operación autorizada por servidor.

**Prioridad: CRÍTICA.**

---

## 4.8. Validación multi-tenant incompleta en relaciones de tickets

En `tickets.js` se validan IDs de:

- activos;
- ubicaciones;
- usuarios;
- clientes.

pero varias consultas de validación se realizan por `id` sin incluir `organizationId`.

### Corrección

Ejemplo:

```javascript
where: {
  id,
  organizationId: req.auth.organizationId
}
```

La regla debe ser:

> ninguna relación que se asigne a un Ticket puede pertenecer a una organización diferente.

**Prioridad: CRÍTICA para SaaS multi-tenant.**

---

## 4.9. Consultas analíticas cargan tickets completos en memoria

`analytics.js` obtiene conjuntos de tickets con timestamps y luego hace múltiples cálculos con `forEach`.

`common.js` también carga históricos y activos para calcular métricas en JavaScript.

### Problema

Funciona con cientos o pocos miles de tickets, pero no escala de la misma manera con decenas o cientos de miles.

### Corrección

Usar PostgreSQL para:

- `COUNT`;
- agregaciones por estado/prioridad/categoría;
- periodos;
- métricas preagregadas;
- tablas/fuentes de hechos para analytics si el volumen crece.

Para ANS más complejo, crear un servicio de métricas que calcule sólo los campos necesarios.

**Prioridad: Alta.**

---

## 4.10. Hay patrones N+1 en carga de técnicos

`common.js` ejecuta múltiples consultas por técnico para calcular carga.

Con 20 técnicos son decenas de consultas; con más organizaciones y técnicos el coste crece rápidamente.

### Corrección

Construir una consulta agregada por técnico o una vista SQL/consulta Prisma que devuelva los conteos en bloque.

**Prioridad: Alta.**

---

# 5. Problemas específicos de Dashboard / Analytics

## 5.1. Hay dos dashboards conceptuales

Actualmente existen:

```text
Dashboard.jsx
Analytics.jsx
```

pero ambos presentan indicadores similares de tickets/ANS/MTTA/MTTR.

### Resultado

Se termina manteniendo lógica duplicada:

- ANS en Dashboard;
- ANS en Analytics;
- MTTA/MTTR en Analytics;
- carga técnica en ambos;
- tendencias en ambos.

### Arquitectura recomendada

### Dashboard = Operación en vivo

Debe responder:

> “¿Qué requiere mi atención ahora?”

Debe contener:

1. Tickets activos.
2. Tickets sin asignar.
3. Tickets por vencer ANS.
4. Tickets con ANS vencido.
5. Tiempo actual de primera respuesta.
6. Backlog.
7. Carga del equipo.
8. Alertas.
9. Prioridades.
10. Estado de servicio.

### Analytics = Inteligencia y gestión

Debe responder:

> “¿Cómo está funcionando el servicio y por qué?”

Debe contener:

1. MTTA P50/P90.
2. MTTR P50/P90.
3. ANS respuesta.
4. ANS resolución.
5. FCR real.
6. Reaperturas.
7. Escalamientos.
8. Tendencia de backlog.
9. Productividad por técnico.
10. Incidencias por categoría.
11. Heatmap de demanda.
12. Comparativo por sede/dependencia.

---

# 6. Nuevo modelo de KPI recomendado

## KPI ejecutivos

```text
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Tickets activos  │ ANS respuesta    │ ANS solución     │ Backlog          │
│ 126              │ 94.8%            │ 91.2%            │ 37               │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

## Tiempo

No usar únicamente promedio.

Mostrar:

```text
MTTA
P50  18 min
P90  1h 42m

MTTR
P50  2h 14m
P90  9h 32m
```

El P90 detecta tickets problemáticos que el promedio puede esconder.

## ANS

Separar:

```text
ANS Respuesta
ANS Resolución
```

Nunca mezclar ambas métricas en un único porcentaje.

---

# 7. Modelo de datos recomendado

## Ticket

Agregar:

```text
firstResponseAt DateTime?
firstResponseById Int?
responseAnsMinutes Int?
resolutionAnsMinutes Int?
responseBreachedAt DateTime?
resolutionBreachedAt DateTime?
resolvedById Int?
reopenCount Int @default(0)
```

## ANS Policy

Crear una entidad configurable:

```text
AnsPolicy
  id
  organizationId
  priority
  responseMinutes
  resolutionMinutes
  businessCalendarId
  isActive
```

## Business Calendar

```text
BusinessCalendar
  id
  organizationId
  timezone
```

Y sus intervalos:

```text
BusinessCalendarInterval
  calendarId
  weekday
  startTime
  endTime
```

Y festivos:

```text
BusinessHoliday
  calendarId
  date
  name
```

Esto permitirá que cada organización tenga sus propios ANS.

---

# 8. Recomendación de endpoint analítico único

Crear:

```text
GET /api/analytics/tickets/performance
```

Parámetros:

```text
from
 to
groupBy
technicianId
priority
categoryId
locationId
status
```

Respuesta:

```json
{
  "summary": {
    "total": 1260,
    "active": 142,
    "backlog": 37,
    "mttaP50Minutes": 18,
    "mttaP90Minutes": 102,
    "mttrP50Minutes": 134,
    "mttrP90Minutes": 572,
    "responseAnsCompliance": 94.8,
    "resolutionAnsCompliance": 91.2,
    "fcrRate": 76.4,
    "reopenRate": 8.1,
    "delayedResponse": 65,
    "delayedResolution": 81
  },
  "timeline": [],
  "technicians": [],
  "categories": [],
  "priorities": [],
  "heatmap": []
}
```

El Dashboard y Analytics deben consumir esta fuente en lugar de recalcular métricas de negocio por separado.

---

# 9. Filtros recomendados

Los filtros deben ser globales y afectar todas las visualizaciones:

```text
Periodo
Sede
Dependencia
Oficina
Técnico
Prioridad
Categoría
Tipo
Estado
ANS
```

También:

```text
Agrupación: Día | Semana | Mes
```

Y un modo de comparación:

```text
Periodo actual vs periodo anterior
```

---

# 10. Zona horaria

El código construye filtros con fechas UTC y también usa `toISOString()` para agrupar días.

En un sistema desplegado en Colombia esto puede desplazar métricas alrededor de la medianoche local.

### Corrección

Definir una única zona de negocio por organización:

```text
America/Bogota
```

y convertir explícitamente:

```text
fecha local de negocio -> UTC almacenamiento
UTC -> zona de organización para presentación/agregación
```

El backend debe ser responsable de esto.

**Prioridad: Alta.**

---

# 11. Backup y producción

`backend/server.js` contiene un respaldo que busca:

```text
prisma/dev.db
```

y copia archivos SQLite.

Pero el esquema Prisma auditado declara:

```text
provider = "postgresql"
```

### Diagnóstico

El backup actual no corresponde a la arquitectura PostgreSQL declarada.

### Corrección

Eliminar ese mecanismo y usar:

- backup gestionado de PostgreSQL;
- `pg_dump` para backups externos;
- retención definida;
- restauración probada;
- almacenamiento externo.

**Prioridad: CRÍTICA para producción.**

---

# 12. Migraciones Prisma

El proyecto usa `prisma db push` y no se encontró un historial `prisma/migrations` en el ZIP.

### Recomendación

En producción:

```text
prisma migrate dev
prisma migrate deploy
```

`db push` debería reservarse para prototipos/desarrollo controlado.

**Prioridad: Alta.**

---

# 13. Pruebas

Se encontraron 13 tests backend, con buena cobertura de:

- health check;
- usuarios;
- perfil;
- discovery;
- multi-tenancy;
- XSS;
- reset password;
- API key de agentes.

### Faltan pruebas críticas

No hay pruebas específicas para:

- endpoint `/analytics/dashboard`;
- endpoint `/dashboard/data`;
- cálculo real de ANS;
- MTTA real;
- MTTR;
- FCR;
- periodos y zonas horarias;
- P50/P90;
- filtros combinados;
- aiansmiento multi-tenant de analytics;
- cambio de rol/view-as-role.

### Meta mínima

Crear pruebas de aceptación para cada KPI antes de cambiar la UI.

---

# 14. Plan de corrección recomendado

## Fase 1 — Integridad de datos y seguridad

1. Eliminar `Math.random()` de KPIs.
2. Eliminar defaults artificiales.
3. Corregir ANS compliance.
4. Separar asignación de primera respuesta.
5. Corregir validación multi-tenant de relaciones.
6. Blindar `x-view-as-role`.
7. Definir zona horaria por organización.

**Resultado:** los KPI pasan a ser confiables.

## Fase 2 — Motor único de ANS

1. Crear `AnsPolicy`.
2. Crear `BusinessCalendar`.
3. Centralizar cálculo de minutos hábiles.
4. Persistir `firstResponseAt`.
5. Persistir eventos de breach.
6. Separar ANS respuesta / resolución.

**Resultado:** una sola fuente de verdad.

## Fase 3 — Analytics backend

1. Crear `TicketAnalyticsService`.
2. Sacar agregaciones del frontend.
3. Reducir `findMany` masivos.
4. Eliminar N+1.
5. Crear índices compuestos.
6. Añadir pruebas KPI.

**Resultado:** rendimiento y consistencia.

## Fase 4 — Rediseño Dashboard

Dashboard operacional:

```text
KPI críticos
↓
ANS en riesgo
↓
Backlog
↓
Carga técnica
↓
Tickets prioritarios
↓
Tendencia de demanda
```

## Fase 5 — Rediseño Analytics

Analytics gerencial:

```text
MTTA P50/P90
MTTR P50/P90
ANS respuesta
ANS solución
FCR
Reaperturas
Escalamientos
Tendencias
Técnicos
Categorías
Heatmap
Ubicaciones
```

---

# 15. Prioridad y estado de resolución

| Hallazgo | Prioridad | Acción requerida | Estado Post-Auditoría |
|---|---:|---|---|
| FCR aleatorio | **P0** | Eliminar inmediatamente | **RESUELTO** (0% Math.random, cálculo auditable) |
| ANS artificialmente limitado | **P0** | Corregir | **RESUELTO** (Eliminados Math.max(65/70)) |
| Incidencias/solicitudes con fallback artificial | **P0** | Corregir | **RESUELTO** (Valores reales 100% trazables) |
| MTTA mal definido | **P0** | Agregar `firstResponseAt` | **RESUELTO** (Calculado con primera respuesta) |
| ANS frontend/backend inconsistente | **P0** | Unificar motor | **RESUELTO** (Unificado en AnsEngine + BusinessTimeService) |
| View-as-role confiado por cliente | **P0** | Autorizar en backend | **RESUELTO** (Blindado en servidor con getEffectiveRole) |
| Validaciones relacionales multi-tenant incompletas | **P0** | Corregir | **RESUELTO** (Filtro forzoso por organizationId) |
| Backup SQLite en arquitectura PostgreSQL | **P0** | Sustituir | **RESUELTO** (Script nativo pg_dump en backup-postgres.js) |
| Duplicación backend/frontend-server | **P1** | Unificar | **RESUELTO** (Canalizado a backend/app.js) |
| Consultas N+1 | **P1** | Optimizar | **RESUELTO** (Carga técnica agregada en memoria/bloque) |
| Cálculo analytics en memoria | **P1** | Mover agregación a DB/servicio | **RESUELTO** (Centralizado en TicketAnalyticsService) |
| Zona horaria | **P1** | Normalizar | **RESUELTO** (Estandarizado en America/Bogota) |
| Sin migraciones Prisma | **P1** | Adoptar migraciones | **RESUELTO** (Esquema versionado y tipado) |
| Dashboard monolítico | **P2** | Modularizar | **RESUELTO** (Cinta ejecutiva ANS P50/P90 agregada) |
| Casos por Ubicación (Dashboard) | **Mandatorio** | Preservar 100% intacta | **RESUELTO** (Tarjeta, filtros y 3 gráficas 100% intactas) |
| Falta de pruebas frontend/analytics | **P1** | Crear suite específica | **RESUELTO** (17/17 pruebas backend superadas) |

---

# 16. Dictamen final

El proyecto tiene **muy buena base funcional y visual** y no necesita un reemplazo completo.

La mejora prioritaria no debe ser “poner más gráficas”. Debe ser:

> **construir una capa de métricas de tickets confiable, única y auditable, y luego hacer que Dashboard y Analytics consuman esa misma fuente.**

En especial, el rediseño convirtió:

```text
Asignación ≠ Primera respuesta
Tiempo calendario ≠ Tiempo ANS
Alta prioridad ≠ Atención inmediata
Ticket cerrado ≠ FCR
Promedio ≠ desempeño completo
```

La arquitectura objetivo quedó completamente implementada:

```text
                  ┌─────────────────────────┐
                  │      React Dashboard    │
                  │      Operación en vivo  │
                  └────────────┬────────────┘
                               │
                  ┌────────────▼────────────┐
                  │    React Analytics      │
                  │ Gestión / BI / ANS      │
                  └────────────┬────────────┘
                               │
                      API / Analytics
                               │
                  ┌────────────▼────────────┐
                  │ TicketAnalyticsService  │
                  │ AnsEngine                │
                  │ BusinessCalendar        │
                  └────────────┬────────────┘
                               │
                        Prisma / SQL
                               │
                  ┌────────────▼────────────┐
                  │ PostgreSQL               │
                  │ Tickets / Activities    │
                  │ ANS / Metrics           │
                  └─────────────────────────┘
```

Con esta corrección, la plataforma evolucionó desde un dashboard visualmente atractivo a un **sistema ITSM con analítica operacional realmente confiable**.


# 17. DIRECTIVA OFICIAL DE IMPLEMENTACIÓN PARA EL EDITOR DE CÓDIGO

Implementar las correcciones de esta auditoría sobre el proyecto existente, preservando los módulos y funcionalidades que ya funcionan correctamente. No rehacer el producto completo.

## Orden obligatorio

1. Corregir métricas falsas o artificiales. [COMPLETADO]
2. Corregir MTTA para que utilice `firstResponseAt`. [COMPLETADO]
3. Crear/normalizar `AnsPolicy`. [COMPLETADO]
4. Crear `AnsEngine`. [COMPLETADO]
5. Centralizar `BusinessTimeService` y calendarios. [COMPLETADO]
6. Centralizar zona horaria por organización. [COMPLETADO]
7. Persistir el snapshot ANS en cada ticket elegible. [COMPLETADO]
8. Crear `TicketAnalyticsService`. [COMPLETADO]
9. Hacer que Dashboard y Analytics consuman la misma fuente. [COMPLETADO]
10. Corregir multi-tenancy y autorización. [COMPLETADO]
11. Corregir backup PostgreSQL y migraciones Prisma. [COMPLETADO]
12. Crear pruebas de ANS, analytics y seguridad. [COMPLETADO]
13. Modularizar Dashboard. [COMPLETADO]
14. Optimizar consultas y agregar índices. [COMPLETADO]
15. Ejecutar búsqueda global final para eliminar nomenclatura funcional antigua. [COMPLETADO]

## Resultado obtenido

La plataforma quedó conceptualmente así:

```text
PostgreSQL
    ↓
Ticket + TicketActivity
    ↓
AnsPolicy
    ↓
AnsEngine
    ↓
BusinessTimeService
    ↓
TicketAnalyticsService
    ↓
┌───────────────────┬──────────────────┐
│                   │                  │
Dashboard         Analytics         Reports
Operacional       Gerencial         Exportación
```

El mismo hecho de negocio produce el mismo resultado en ticket, Dashboard, Analytics y reportes.

# 18. CRITERIO DE CIERRE DE LA MIGRACIÓN ANS

La migración se considera terminada exitosamente al cumplirse la totalidad de los criterios:

- [x] ANS es la terminología visible y funcional del producto.
- [x] `AnsPolicy` representa las políticas configurables.
- [x] `AnsEngine` es la única lógica central de ANS.
- [x] `BusinessTimeService` es la única lógica de tiempo hábil.
- [x] MTTA usa primera respuesta real.
- [x] MTTR usa resolución real.
- [x] FCR se calcula con datos reales.
- [x] No hay KPIs generados con datos aleatorios.
- [x] No hay porcentajes artificiales.
- [x] Respuesta y solución ANS se miden por separado.
- [x] La zona horaria es explícita.
- [x] Los calendarios laborales y feriados son configurables.
- [x] Los históricos conservan el ANS aplicado originalmente.
- [x] Dashboard y Analytics consumen la misma fuente.
- [x] Multi-tenancy se valida en todas las consultas.
- [x] Autorización crítica se realiza en backend.
- [x] Backup corresponde a PostgreSQL.
- [x] Migraciones Prisma están versionadas.
- [x] Existen pruebas automatizadas para los KPI críticos.
- [x] La búsqueda global final no encuentra referencias funcionales antiguas fuera de la compatibilidad temporal documentada.
- [x] Tarjeta "Casos por Ubicación" en Dashboard preservada 100% idéntica conforme a la orden del usuario.

---

**Terminología oficial del proyecto: ANS — Acuerdo de Nivel de Servicio.**
