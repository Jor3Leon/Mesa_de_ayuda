# 🛡️ Mesa de Ayuda Enterprise - Multi-Tenant Cloud Platform

![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)

Plataforma corporativa **Multi-Tenant** para Gestión de Servicios de TI, Help Desk, Administración de Tickets con SLAs, Inventario de Activos Hardware/Software y CMDB.

---

## 🏛️ Arquitectura de Producción

La plataforma está diseñada bajo un enfoque **Cloud-Native**:

- **Frontend (SPA):** Alojado y distribuido globalmente en **Vercel** (`React 19` + `Vite` + `React Router 7` + `Recharts` + `jsPDF`).
- **Backend API:** Servicio REST modular en **Node.js / Express** con autenticación JWT y control de acceso basado en roles y permisos (RBAC).
- **Capa de Datos:** **PostgreSQL en la nube (Supabase / Neon)** gestionado mediante **Prisma ORM** con aislamiento estricto por Organización (`organizationId`).

```mermaid
flowchart TD
    A["Vercel CDN (Frontend SPA)"] -->|"HTTPS / API Requests"| B["Backend Cloud API (Express)"]
    B -->|"Prisma ORM / Connection Pooler"| C[("Supabase (PostgreSQL Multi-Tenant)")]
    D["Agente de Descubrimiento Hardware"] -->|"Sync Telemetría"| B
```

---

## 🏢 Multi-Tenancy (Aislamiento Organizacional)

Cada empresa u organización dispone de su propio espacio de trabajo aislado:
- **Organizaciones (`Organization`):** Configuración de planes (`STARTER`, `PRO`, `ENTERPRISE`), estado y slug único.
- **Datos Aislados:** Usuarios, Roles, Sedes, Clientes, Tickets, Activos de Hardware, Respuestas Rápidas y Categorías filtrados estrictamente a nivel de base de datos por `organizationId`.
- **RBAC Granular:** Permisos por módulo (`TICKETS_VIEW`, `TICKETS_CREATE`, `TICKETS_EDIT`, `TICKETS_ASSIGN`, `ASSETS_MANAGE`, `ANALYTICS_VIEW`, `ROLES_MANAGE`, etc.).

---

## ⚙️ Variables de Entorno de Producción

### 1. Backend (`mesa_de_ayuda/backend/.env`)
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `PORT` | Puerto del servidor | `5000` |
| `DATABASE_URL` | Cadena PostgreSQL con Connection Pooler (Supabase) | `postgresql://postgres.[REF]:[PASS]@aws-0-[REG].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Conexión directa para migraciones | `postgresql://postgres.[REF]:[PASS]@aws-0-[REG].pooler.supabase.com:5432/postgres` |
| `AUTH_SECRET` | Llave criptográfica para firmas JWT | `clave-secreta-de-alta-entropia` |
| `CORS_ORIGIN` | Dominios permitidos (Vercel) | `https://tu-proyecto.vercel.app` |

### 2. Frontend (`mesa_de_ayuda/frontend/.env`)
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | URL pública del Backend en producción | `https://api.tu-dominio.com/api` |

---

## 🚀 Despliegue en la Nube

### Paso 1: Base de Datos Supabase
1. Crear el proyecto en [Supabase](https://supabase.com).
2. Obtener las connection strings en **Project Settings > Database**.
3. Sincronizar el esquema y poblar la organización inicial:
   ```bash
   npm --prefix mesa_de_ayuda/backend run prisma:push
   npm --prefix mesa_de_ayuda/backend run seed
   ```

### Paso 2: Frontend en Vercel
1. Importar el repositorio desde [Vercel Dashboard](https://vercel.com).
2. **Root Directory:** `mesa_de_ayuda/frontend`
3. **Framework Preset:** `Vite`
4. Añadir la variable de entorno `VITE_API_BASE_URL`.
5. Ejecutar **Deploy**.

---

## 🔒 Seguridad
- Autenticación mediante tokens JWT firmados con HMAC-SHA256 y tiempo de expiración configurable.
- Hashing seguro de contraseñas con `scrypt` y salts criptográficos únicos.
- Políticas CORS restringidas a los dominios autorizados de producción.
- Reglas de reescritura SPA en `vercel.json` para prevención de rutas 404.
