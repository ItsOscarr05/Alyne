# Troubleshooting Guide

## Overview
This guide helps diagnose and resolve common issues when developing or deploying the Alyne application.

## Quick Diagnostics

### Check Service Status
```powershell
# Backend health
Invoke-WebRequest -Uri "http://localhost:3000/health"

# Database connection
cd backend
pnpm exec prisma db pull

# Redis connection (if configured)
node -e "const redis = require('redis'); const client = redis.createClient({url: process.env.REDIS_URL}); client.connect().then(() => console.log('OK')).catch(console.error)"
```

## Backend Issues

### Database Connection Errors

**Symptoms:**
- `Can't reach database server`
- `Connection timeout`
- `Authentication failed`

**Solutions:**

1. **Verify Database URL**
   ```powershell
   # Check .env file
   Get-Content backend\.env | Select-String "DATABASE_URL"
   
   # Test connection
   psql $env:DATABASE_URL
   ```

2. **Check Database is Running**
   ```powershell
   # Windows (if using local PostgreSQL)
   Get-Service postgresql*
   
   # Start if stopped
   Start-Service postgresql-x64-14
   ```

3. **Verify Credentials**
   - Check username and password in `DATABASE_URL`
   - Ensure database exists
   - Verify user has proper permissions

4. **Network/Firewall Issues**
   - Check if database port (5432) is accessible
   - Verify firewall rules
   - For cloud databases, check IP whitelist

### Prisma Errors

**Symptoms:**
- `Prisma Client not generated`
- `Schema validation errors`
- `Migration conflicts`

**Solutions:**

1. **Regenerate Prisma Client**
   ```powershell
   cd backend
   pnpm exec prisma generate
   ```

2. **Reset Database (Development Only)**
   ```powershell
   pnpm exec prisma migrate reset
   ```

3. **Resolve Migration Conflicts**
   ```powershell
   # Check migration status
   pnpm exec prisma migrate status
   
   # Mark migration as applied (if needed)
   pnpm exec prisma migrate resolve --applied <migration-name>
   ```

### Port Already in Use

**Symptoms:**
- `EADDRINUSE: address already in use :::3000`
- Server won't start

**Solutions:**

1. **Find Process Using Port**
   ```powershell
   Get-NetTCPConnection -LocalPort 3000 | Select-Object -Property OwningProcess
   ```

2. **Kill Process**
   ```powershell
   # Replace <PID> with actual process ID
   Stop-Process -Id <PID> -Force
   ```

3. **Use Kill Port Script**
   ```powershell
   cd backend
   .\kill-port.ps1
   ```

4. **Change Port**
   ```powershell
   # In .env file
   PORT=3001
   ```

### Redis Connection Errors

**Symptoms:**
- `Redis connection failed`
- Cache not working

**Solutions:**

1. **Verify Redis is Running**
   ```powershell
   # Check if Redis is running
   Get-Process redis-server -ErrorAction SilentlyContinue
   ```

2. **Check Redis URL**
   ```powershell
   Get-Content backend\.env | Select-String "REDIS_URL"
   ```

3. **Note**: Application will continue without Redis (graceful degradation)
   - Caching will be disabled
   - All other features work normally

### Authentication Issues

**Symptoms:**
- `Invalid token`
- `Authentication required` errors
- Login not working

**Solutions:**

1. **Check JWT Secret**
   ```powershell
   # Verify JWT_SECRET is set
   Get-Content backend\.env | Select-String "JWT_SECRET"
   ```

2. **Verify Token Format**
   - Token should be in `Authorization: Bearer <token>` header
   - Check token hasn't expired

3. **Clear Old Tokens**
   - Log out and log back in
   - Clear browser/app storage

### Payment Processing Errors

**Symptoms:**
- Stripe errors
- Payment intent creation fails
- Plaid errors

**Solutions:**

1. **Verify Stripe Keys**
   ```powershell
   # Check keys are set
   Get-Content backend\.env | Select-String "STRIPE"
   Get-Content mobile\.env | Select-String "STRIPE"
   ```

2. **Check Key Type**
   - Use test keys (`sk_test_`, `pk_test_`) for development
   - Use live keys (`sk_live_`, `pk_live_`) for production
   - Ensure environment matches key type

3. **Verify Plaid Environment**
   - Use `sandbox` for development
   - Use `production` for live
   - Check `PLAID_ENV` matches keys

## Mobile App Issues

### Expo/Metro Bundler Errors

**Symptoms:**
- `Module not found`
- `Unable to resolve module`
- Bundler crashes

**Solutions:**

1. **Clear Cache**
   ```powershell
   cd mobile
   pnpm start -- --clear
   ```

2. **Reset Metro Cache**
   ```powershell
   pnpm start -- --reset-cache
   ```

3. **Reinstall Dependencies**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item pnpm-lock.yaml
   pnpm install
   ```

### API Connection Errors

**Symptoms:**
- `Network request failed`
- `Cannot connect to server`
- CORS errors

**Solutions:**

1. **Verify Backend is Running**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3000/health"
   ```

2. **Check API_BASE_URL**
   ```powershell
   Get-Content mobile\.env | Select-String "API_BASE_URL"
   ```

3. **Verify CORS Configuration**
   - Check `FRONTEND_URL` in backend `.env`
   - Ensure mobile app URL is allowed

### Build Errors

**Symptoms:**
- TypeScript errors
- Import errors
- Build fails

**Solutions:**

1. **Check TypeScript**
   ```powershell
   cd mobile
   pnpm exec tsc --noEmit
   ```

2. **Verify Imports**
   - Check file paths are correct
   - Ensure files exist
   - Check case sensitivity

3. **Clear Build Cache**
   ```powershell
   Remove-Item -Recurse -Force .expo
   Remove-Item -Recurse -Force node_modules/.cache
   ```

## Common Issues

### Environment Variables Not Loading

**Symptoms:**
- `undefined` values
- Default values used instead

**Solutions:**

1. **Verify File Location**
   - `.env` must be in project root
   - Not in subdirectories

2. **Check File Format**
   ```env
   # Correct
   API_BASE_URL=http://localhost:3000/api
   
   # Wrong (no spaces around =)
   API_BASE_URL = http://localhost:3000/api
   ```

3. **Restart Application**
   - Environment variables load at startup
   - Changes require restart

### TypeScript Errors

**Symptoms:**
- Type errors
- Import errors
- Compilation fails

**Solutions:**

1. **Check Type Definitions**
   ```powershell
   pnpm install --save-dev @types/node @types/react
   ```

2. **Verify tsconfig.json**
   - Check `include` and `exclude` paths
   - Verify `compilerOptions`

3. **Clear TypeScript Cache**
   ```powershell
   Remove-Item -Recurse -Force node_modules/.cache
   ```

### Socket.io Connection Issues

**Symptoms:**
- Messages not sending
- Real-time features not working
- Connection errors

**Solutions:**

1. **Verify Socket.io Server**
   - Check backend is running
   - Verify Socket.io is initialized

2. **Check CORS for Socket.io**
   - Socket.io uses different CORS config
   - Check `io` configuration in `backend/src/index.ts`

3. **Verify Authentication Token**
   - Socket.io requires authentication
   - Token must be valid JWT

### Payment Flow Issues

**Symptoms:**
- Payment not processing
- Provider not receiving payment
- Platform fee issues

**Solutions:**

1. **Check Payment Service Logs**
   ```powershell
   # Check backend logs for payment errors
   # Look for Stripe/Plaid errors
   ```

2. **Verify Provider Bank Account**
   - Provider must have verified bank account
   - Check `bankAccountVerified` in database

3. **Check Payment Amounts**
   - Verify `platformFee` and `providerAmount` are calculated correctly
   - Check payment service logs

## Performance Issues

### Slow API Responses

**Symptoms:**
- Requests taking >1 second
- Timeout errors

**Solutions:**

1. **Check Database Queries**
   ```powershell
   # Enable Prisma query logging
   # In backend/src/index.ts, add:
   # const prisma = new PrismaClient({ log: ['query', 'error'] })
   ```

2. **Verify Indexes**
   ```powershell
   cd backend
   pnpm exec prisma studio
   # Check if indexes are being used
   ```

3. **Check Redis Cache**
   - Verify Redis is working
   - Check cache hit rates

### High Memory Usage

**Symptoms:**
- Application crashes
- Slow performance

**Solutions:**

1. **Check for Memory Leaks**
   - Monitor memory usage over time
   - Look for continuously increasing memory

2. **Optimize Queries**
   - Use `select` instead of `include` where possible
   - Limit result sets with pagination

3. **Restart Application**
   ```powershell
   # If using PM2
   pm2 restart alyne-backend
   ```

## Getting Help

### Debug Mode

Enable debug logging:

```powershell
# Backend
$env:LOG_LEVEL = "debug"
pnpm run dev

# Mobile
$env:NODE_ENV = "development"
pnpm start
```

### Log Files

**Backend Logs:**
- Development: Console output
- Production: `backend/logs/error.log`, `backend/logs/combined.log`

**Mobile Logs:**
- Expo: Console output
- React Native Debugger: Enable remote debugging

### Useful Commands

```powershell
# Check all environment variables
Get-Content backend\.env
Get-Content mobile\.env

# Verify services are running
Get-Process node
Get-Process postgres
Get-Process redis-server

# Check port usage
Get-NetTCPConnection -LocalPort 3000
Get-NetTCPConnection -LocalPort 5432
Get-NetTCPConnection -LocalPort 6379

# Database status
cd backend
pnpm exec prisma migrate status

# Test API endpoints
Invoke-WebRequest -Uri "http://localhost:3000/health"
Invoke-WebRequest -Uri "http://localhost:3000/api-docs"
```

## Still Having Issues?

1. **Check Documentation**
   - [Environment Setup Guide](./ENVIRONMENT_SETUP.md)
   - [Deployment Guide](./DEPLOYMENT.md)
   - [Security Guide](./SECURITY.md)

2. **Review Logs**
   - Backend: Check console or log files
   - Mobile: Check Expo console

3. **Verify Configuration**
   - All environment variables set
   - Services are running
   - Network connectivity

4. **Common Solutions**
   - Restart all services
   - Clear caches
   - Reinstall dependencies
   - Check for typos in configuration

---

**Last Updated:** November 2024

