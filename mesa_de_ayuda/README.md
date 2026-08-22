# 🛠️ Mesa de Ayuda / Help Desk Project

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

---

## 🇬🇧 English Documentation

### 📌 Project Overview
Full-stack application for an IT Service Desk, incident/ticket management, hardware asset inventory, and CMDB (Configuration Management Database).

### 🏗️ Structure
- `frontend/`: Web interface and operational dashboards.
- `backend/`: REST API, Authentication, Prisma ORM, and database logic.
- `backend/prisma/dev.db`: Canonical SQLite database for the project.

### 🚀 Getting Started

1. **Backend Setup:**
   ```powershell
   cd backend
   copy .env.example .env
   npm install
   npm run dev
   ```

2. **Frontend Setup (in a new terminal):**
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

3. Open the Vite URL displayed in your console (usually `http://localhost:5173`). In development, the frontend proxies API requests to `http://localhost:5000`.

### 🔐 Environment Variables

#### Backend (`backend/.env`)
- `PORT`: API Port (Default: `5000`).
- `CORS_ORIGIN`: Allowed origins (comma-separated). Uses `http://localhost:5173` by default.
- `AUTH_SECRET`: Secret key for JWT signing.
- `SEED_*_PASSWORD`: Optional passwords for default seeded users.

#### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL`: Base URL for the backend API (Default: `/api`).

### ⌨️ Useful Commands

**Backend:**
- `npm run dev`: Start API in watch mode.
- `npm start`: Start API normally.
- `npm run prisma:generate`: Regenerate Prisma Client.
- `npm run prisma:push`: Sync Prisma schema with SQLite.
- `npm run seed`: Populate database with initial data.

**Frontend:**
- `npm run dev`: Start Vite dev server.
- `npm run build`: Generate production build.

---

## 🇪🇸 Documentación en Español

### 📌 Descripción del Proyecto
Aplicación full-stack diseñada para una Mesa de Servicios de TI, gestión de tickets, inventario de activos de hardware y CMDB (Base de Datos de Gestión de Configuración).

### 🏗️ Estructura
- `frontend/`: Interfaz web y paneles operativos.
- `backend/`: API REST, Autenticación, Prisma ORM y lógica de base de datos.
- `backend/prisma/dev.db`: Base de datos SQLite canónica del proyecto.

### 🚀 Puesta en Marcha

1. **Configuración del Backend:**
   ```powershell
   cd backend
   copy .env.example .env
   npm install
   npm run dev
   ```

2. **Configuración del Frontend (en otra terminal):**
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

3. Abre la URL de Vite mostrada en la consola (usualmente `http://localhost:5173`). En desarrollo, el frontend redirige las peticiones de la API mediante proxy hacia `http://localhost:5000`.

### 🔐 Variables de Entorno

#### Backend (`backend/.env`)
- `PORT`: Puerto de la API (Por defecto `5000`).
- `CORS_ORIGIN`: Orígenes permitidos (separados por comas). 
- `AUTH_SECRET`: Secreto para firmar los tokens JWT.
- `SEED_*_PASSWORD`: Contraseñas opcionales para los usuarios de prueba.

#### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL`: URL base de la API (Por defecto `/api`).

### ⌨️ Comandos Útiles

**Backend:**
- `npm run dev`: Inicia la API con recarga automática por cambios.
- `npm start`: Inicia la API una sola vez.
- `npm run prisma:generate`: Regenera el cliente Prisma.
- `npm run prisma:push`: Sincroniza el esquema con la base de datos SQLite.
- `npm run seed`: Inserta datos de prueba en la base de datos.

**Frontend:**
- `npm run dev`: Inicia el servidor de desarrollo Vite.
- `npm run build`: Genera los archivos compilados para producción.

---

*Desarrollado y optimizado utilizando un enfoque escalable y responsivo.*
*Built and optimized using a scalable, responsive approach.*
