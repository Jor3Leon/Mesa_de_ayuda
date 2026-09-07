# Directiva obligatoria de corrección — Mesa de Ayuda (fase actual)

**Estado del proyecto:** pruebas en Vercel + base de datos gestionada (tipo Neon). Docker es el objetivo final, pero **no se trabaja todavía**. La prioridad actual es dejar resueltos los problemas de fondo y construir el módulo de Analítica tal como se necesita para operar.

Este documento es de cumplimiento obligatorio. Ninguna fase se da por cerrada sin evidencia real (comando ejecutado + resultado), no solo con la palabra "RESUELTO" en un documento.

---

## 0. Regla rectora

Debe existir una sola fuente de verdad para el backend (`backend/`). Ningún otro directorio puede duplicar lógica de negocio.

## 0.1 Distinción obligatoria entre Dashboard y Analítica

Son **dos módulos con propósitos distintos** y no deben mezclarse:

- **Dashboard** → indicadores **globales/generales** de todos los tickets de la organización (esto ya existe y **no se toca**, incluida la tarjeta "Casos por Ubicación").
- **Analítica** → indicadores **individuales de desempeño por técnico** (N1, N2, N3, etc.), con visibilidad restringida según jerarquía de roles. Este es el módulo que se rediseña en la Fase 3.

---

## FASE 1 — Eliminar la duplicación backend (P0, bloqueante)

**Problema real:** `frontend/server/routes/*` es una copia desactualizada de `backend/routes/*` (con `Math.random()` en FCR y pisos artificiales `Math.max(65/70,...)` que solo se corrigieron en `backend/`). Además `frontend/api/index.js` tiene un fallback silencioso (`try backend/app → catch server/app`) que puede reactivar la copia rota según el despliegue.

### Acciones obligatorias
1. Eliminar por completo `frontend/server/` (routes, lib, app.js, auth.js, package.json).
2. Eliminar el `try/catch` de fallback en `frontend/api/index.js`; debe importar solo `backend/app.js` y fallar de forma ruidosa si no puede.
3. `grep -r "frontend/server" .` (sin `node_modules`) debe quedar en cero resultados.
4. `npm test` en `backend/` debe seguir en 17/17 después del borrado.

### Checklist de cierre
- [ ] `frontend/server/` ya no existe.
- [ ] `frontend/api/index.js` sin fallback.
- [ ] Grep de referencias en cero.
- [ ] Tests en 17/17.

---

## FASE 2 — Terminar la migración SLA → ANS (P0)

**Problema real:** el backend usa "ANS" de forma consistente, pero el frontend conserva componentes y strings visibles con "SLA" (`SlaBadge.jsx`, `CategorySelector.jsx`, `TicketList.jsx`, `AnalyticsFilters.jsx`, `index.css`, vistas `Roles.jsx`, `Categories.jsx`, `Assets.jsx`, `Users.jsx`, `Analytics.jsx`, `Customers.jsx`, `StandarUserPortal.jsx`).

### Acciones obligatorias
1. Renombrar `SlaBadge.jsx` → `AnsBadge.jsx` (y equivalentes).
2. Renombrar props/estados/hooks internos de `sla` a `ans`.
3. Reemplazar todo texto visible "SLA" por "ANS".
4. La columna de base de datos `sla` (String) puede conservar su nombre técnico por compatibilidad, pero no debe mostrarse como tal en la interfaz.

### Checklist de cierre
- [ ] `grep -rli "sla" frontend/src` sin resultados funcionales.
- [ ] `vite build` sin errores tras el renombrado.

---

## FASE 3 — Rediseño obligatorio del módulo de Analítica (P0, foco actual)

### 3.1 Objetivo funcional (definido por el usuario)

El módulo de Analítica es **individual, no global**. Cada técnico ve su propio desempeño; el Dashboard es el único lugar con cifras generales de "todos y todo".

**Los 8 indicadores por técnico** (mismos que ya se definieron, pero ahora calculados con `assignedToId = <técnico seleccionado>`, no sobre el total de la organización):

Bloque A — Conteos operativos del técnico:
1. Tickets **asignados**.
2. Tickets **resueltos**.
3. Tickets **programados**.
4. Tickets **no resueltos**.
5. Tickets **tardíos**.

Bloque B — Desempeño del técnico:
6. **MTTA** (P50/P90) — calculado solo sobre sus tickets.
7. **MTTR** (P50/P90) — calculado solo sobre sus tickets.
8. **% de cumplimiento ANS** (respuesta y solución) — calculado solo sobre sus tickets.

### 3.2 Reglas de visibilidad jerárquica (obligatorias)

| Quién consulta | Qué puede ver |
|---|---|
| **Administrador** | Los indicadores individuales de **cualquier** técnico (N1, N2, N3). |
| **N3** | Los suyos propios, **más** los de N1 y N2. |
| **N2** | Los suyos propios. *(Supuesto: no se mencionó si N2 ve a N1; se asume que no. Confirmar antes de implementar.)* |
| **N1** | Únicamente los suyos propios. |

**Hallazgo importante del código actual:** el modelo `Role` de Prisma es genérico y configurable por organización (no existe hoy un campo que represente "N1 < N2 < N3"). `getEffectiveRole()` en `backend/lib/middleware.js` solo distingue `ADMIN`/`SUPERVISOR` para permitir "ver como". **No hay ningún mecanismo de jerarquía entre roles operativos hoy.** Este mecanismo hay que construirlo desde cero, no es una simple etiqueta cosmética como ANS.

### 3.3 Acciones obligatorias — Backend

1. **Agregar jerarquía a `Role`:** añadir un campo (ej. `hierarchyLevel Int`) en el modelo `Role` de Prisma, con migración correspondiente. Ejemplo: N1 = 1, N2 = 2, N3 = 3, Admin = nivel especial que ve todo sin importar el número.
2. **Crear una función de autorización dedicada**, análoga a `getEffectiveRole`, por ejemplo `canViewTechnicianAnalytics(requestingUser, targetTechnicianId)`, que resuelva en servidor (nunca confiando en el cliente):
   - Admin → siempre `true`.
   - Mismo usuario consultando sus propios datos → `true`.
   - `requestingUser.role.hierarchyLevel > targetUser.role.hierarchyLevel` → `true`.
   - En cualquier otro caso → `false` (403).
3. **Nuevo endpoint** (o extensión del existente) `GET /api/analytics/technician/:technicianId`, protegido por la función anterior, que devuelva los 8 indicadores filtrados por `assignedToId = technicianId` y aislado por `organizationId` (igual que el resto del sistema).
4. Reutilizar el motor ya existente (`TicketAnalyticsService`, `AnsEngine`, `BusinessTimeService`) pasándole el filtro de técnico — no duplicar lógica de cálculo, solo el filtro cambia.
5. **Tests obligatorios nuevos** en `server.test.js`:
   - N1 intenta ver los indicadores de otro N1 → 403.
   - N2 intenta ver los de N3 → 403.
   - N3 ve los de N1 y N2 → 200 con datos correctos.
   - Admin ve los de cualquiera → 200.
   - Un técnico ve los suyos propios → 200.

### 3.4 Acciones obligatorias — Frontend

1. En el módulo de Analítica, agregar un **selector de técnico**, que:
   - Para un N1/N2 sin subordinados: no muestra selector, carga directamente sus propios datos.
   - Para un N3: el selector solo lista N1 y N2 (y él mismo).
   - Para Admin: el selector lista a todos los técnicos.
   - La lista de opciones del selector la decide el **backend** (no filtrar solo en el cliente); el backend debe exponer "a quién puedo ver" además de los datos.
2. Los 8 indicadores se muestran igual que en el Dashboard visualmente (tarjetas Bloque A + Bloque B), pero con una etiqueta visible de "Desempeño de: [nombre del técnico]" para que no se confunda con las cifras globales del Dashboard.
3. No reutilizar el mismo componente del Dashboard tal cual: aunque el diseño visual pueda ser similar, la fuente de datos y el endpoint son distintos.

### Checklist de cierre
- [ ] Confirmada la regla real para N2 (¿ve o no a N1?).
- [ ] Campo de jerarquía agregado a `Role` + migración aplicada.
- [ ] Función de autorización `canViewTechnicianAnalytics` implementada y usada en el endpoint.
- [ ] Endpoint de analítica por técnico funcionando con los 8 indicadores.
- [ ] Selector de técnico en frontend, con opciones decididas por el backend según jerarquía.
- [ ] 5 tests nuevos de autorización jerárquica, todos en verde.
- [ ] Dashboard global permanece sin cambios.

---

## FASE 4 — Normalizar configuración de despliegue de pruebas (P1)

Hay tres pares `vercel.json` + `api/index.js` (raíz, `mesa_de_ayuda/`, `mesa_de_ayuda/frontend/`). Mientras se siga probando en Vercel, dejar solo **uno** activo (el de la raíz, que ya apunta a `backend/app.js`).

### Checklist de cierre
- [ ] Solo un `vercel.json` activo en el repo; los otros dos eliminados o movidos fuera de la ruta de build.

---

## Orden de ejecución obligatorio (fase actual)

1. FASE 1 — elimina duplicación (bloqueante para todo lo demás).
2. FASE 2 — nomenclatura ANS completa.
3. FASE 3 — módulo de Analítica individual con jerarquía N1/N2/N3 (foco principal de esta etapa).
4. FASE 4 — una sola configuración de despliegue de pruebas.

---

## Fase futura (no ejecutar todavía) — Empaquetado Docker

Se retoma cuando las fases anteriores estén cerradas y verificadas: `backend/Dockerfile`, `frontend/Dockerfile` (build + Nginx), `docker-compose.yml` con Postgres local, y prueba end-to-end sin depender de Vercel/Neon.
