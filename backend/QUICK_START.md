# Quick Start - Backend Server

## Prerequisites

The backend needs a `.env` file to run. Create one in the `backend/` directory.

## Minimal .env Setup

Create `backend/.env` with at minimum:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-random-secret-key-here
FRONTEND_URL=http://localhost:8081
```

## Database Setup (Required for Auth)

The authentication system requires a database. You have two options:

### Option 1: PostgreSQL (Recommended)

1. Install PostgreSQL locally or use a cloud service (Supabase, Railway, etc.)
2. Create a database
3. Add to `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/alyne_db
   ```
4. Run migrations:
   ```powershell
   cd backend
   pnpm exec prisma migrate dev --name init
   pnpm exec prisma generate
   ```

### Option 2: SQLite (Quick Testing)

1. Update `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```
2. Run migrations:
   ```powershell
   cd backend
   pnpm exec prisma migrate dev --name init
   pnpm exec prisma generate
   ```

## Starting the Server

```powershell
cd backend
pnpm run dev
```

The server will start on `http://localhost:3000`

## Test User

Once the database is set up, you can use:
- Email: `test@alyne.com`
- Password: `anything` (in development mode)

