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

- **Frontend (SPA):** Alojado en **Vercel** (`React 19` + `Vite` + `React Router 7` + `Recharts` + `jsPDF`).
- **Backend API:** Servicio REST modular en **Node.js / Express** con autenticación JWT y RBAC.
- **Base de Datos:** **PostgreSQL en Supabase** con aislamiento estricto por Organización (`organizationId`).

---

## 🚀 Despliegue en Producción

### 1. Base de Datos Supabase (PostgreSQL)
```bash
npm --prefix backend run prisma:push
npm --prefix backend run seed
```

### 2. Frontend en Vercel
- **Root Directory:** `mesa_de_ayuda/frontend` (o `frontend`)
- **Framework:** `Vite`
- **Variable de Entorno:** `VITE_API_BASE_URL`
