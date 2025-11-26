# Database Setup Guide

## Quick Setup Options

### Option 1: Supabase (Recommended - Easiest)

1. Go to https://supabase.com
2. Sign up for free
3. Create a new project
4. Go to **Settings** → **Database**
5. Copy the **Connection string** (URI format)
6. Add it to `backend/.env` as `DATABASE_URL=...`

**Example:**
```
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Option 2: Railway

1. Go to https://railway.app
2. Sign up for free
3. Create a new project
4. Add a **PostgreSQL** service
5. Copy the **DATABASE_URL** from the service variables
6. Add it to `backend/.env`

### Option 3: Neon

1. Go to https://neon.tech
2. Sign up for free
3. Create a new project
4. Copy the connection string
5. Add it to `backend/.env` as `DATABASE_URL=...`

### Option 4: Local PostgreSQL

If you have PostgreSQL installed locally:

1. Create a database:
   ```sql
   CREATE DATABASE alyne_db;
   ```

2. Add to `backend/.env`:
   ```
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/alyne_db
   ```

## After Setting DATABASE_URL

1. Run migrations:
   ```powershell
   cd backend
   pnpm exec prisma migrate dev --name init
   ```

2. Generate Prisma Client:
   ```powershell
   pnpm exec prisma generate
   ```

3. Seed the database:
   ```powershell
   pnpm run seed
   ```

## Need Help?

- Supabase: https://supabase.com/docs/guides/database/connecting-to-postgres
- Railway: https://docs.railway.app/databases/postgresql
- Neon: https://neon.tech/docs/connect/connect-from-any-app

