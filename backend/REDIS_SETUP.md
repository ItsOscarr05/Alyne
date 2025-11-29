# Redis Setup Guide

## Overview
Redis is an optional caching layer that improves application performance. The app works fine without it, but Redis provides faster response times for frequently accessed data.

## Quick Setup Options for Windows

### Option 1: Docker (Easiest - Recommended)

**Prerequisites:**
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

**Steps:**
```powershell
# Pull Redis image
docker pull redis:7-alpine

# Run Redis container
docker run -d --name redis-alyne -p 6379:6379 redis:7-alpine

# Verify it's running
docker ps
```

**Stop Redis:**
```powershell
docker stop redis-alyne
```

**Start Redis (if stopped):**
```powershell
docker start redis-alyne
```

**Remove Redis:**
```powershell
docker stop redis-alyne
docker rm redis-alyne
```

### Option 2: WSL2 (Windows Subsystem for Linux)

**Prerequisites:**
- WSL2 installed ([Install Guide](https://learn.microsoft.com/en-us/windows/wsl/install))

**Steps:**
```powershell
# Open WSL terminal
wsl

# Update package list
sudo apt update

# Install Redis
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Verify it's running
redis-cli ping
# Should return: PONG
```

**Start Redis on boot:**
```bash
# In WSL
sudo systemctl enable redis-server
```

**Stop Redis:**
```bash
sudo service redis-server stop
```

### Option 3: Memurai (Windows Native)

**Steps:**
1. Download from [Memurai.com](https://www.memurai.com/get-memurai)
2. Install the MSI package
3. Redis will run as a Windows service automatically
4. Default port: 6379

**Note:** Memurai is a Redis-compatible server for Windows.

### Option 4: Redis Cloud (Free Tier - No Installation)

**Steps:**
1. Sign up at [Redis Cloud](https://redis.com/try-free/)
2. Create a free database
3. Copy the connection URL
4. Add to `.env`:
   ```env
   REDIS_URL=redis://default:password@host:port
   ```

**Benefits:**
- No local installation
- Free tier available
- Managed service
- Works immediately

## Configuration

### Add to `.env`

After installing Redis, add to `backend/.env`:

```env
# For local Redis (Docker/WSL/Memurai)
REDIS_URL=redis://localhost:6379

# For Redis Cloud
REDIS_URL=redis://default:your-password@your-host:port
```

### Verify Connection

```powershell
# Test Redis connection
cd backend
node -e "const redis = require('redis'); const client = redis.createClient({url: process.env.REDIS_URL || 'redis://localhost:6379'}); client.connect().then(() => { console.log('✅ Redis connected!'); client.quit(); }).catch(err => console.error('❌ Redis error:', err.message));"
```

## Testing Redis

### Using Redis CLI

**If using Docker:**
```powershell
docker exec -it redis-alyne redis-cli
```

**If using WSL:**
```bash
redis-cli
```

**Commands:**
```redis
# Test connection
PING
# Should return: PONG

# Set a test value
SET test "Hello Redis"

# Get the value
GET test
# Should return: "Hello Redis"

# Exit
exit
```

## Troubleshooting

### Redis Not Starting

**Docker:**
```powershell
# Check if container is running
docker ps -a

# Check logs
docker logs redis-alyne

# Restart container
docker restart redis-alyne
```

**WSL:**
```bash
# Check if Redis is running
sudo service redis-server status

# Start Redis
sudo service redis-server start
```

### Port Already in Use

If port 6379 is already in use:

**Option 1: Use different port**
```powershell
# Docker with custom port
docker run -d --name redis-alyne -p 6380:6379 redis:7-alpine
```

Then update `.env`:
```env
REDIS_URL=redis://localhost:6380
```

**Option 2: Find and stop conflicting service**
```powershell
# Find what's using port 6379
Get-NetTCPConnection -LocalPort 6379 | Select-Object -Property OwningProcess

# Stop the process (replace PID)
Stop-Process -Id <PID> -Force
```

### Connection Refused

1. **Check Redis is running:**
   ```powershell
   # Docker
   docker ps | findstr redis
   
   # WSL
   wsl -e bash -c "sudo service redis-server status"
   ```

2. **Check firewall:**
   - Windows Firewall might be blocking port 6379
   - Allow Redis through firewall if needed

3. **Verify URL in `.env`:**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

## Recommended Setup

### For Development
- **Docker**: Easiest, no system changes
- **WSL2**: If you already use WSL

### For Production
- **Redis Cloud**: Managed service, no maintenance
- **Docker**: If you're already using Docker in production
- **Managed Redis**: AWS ElastiCache, Azure Cache, etc.

## Quick Start (Docker - Recommended)

```powershell
# 1. Install Docker Desktop (if not installed)
# Download from: https://www.docker.com/products/docker-desktop/

# 2. Start Docker Desktop

# 3. Run Redis
docker run -d --name redis-alyne -p 6379:6379 redis:7-alpine

# 4. Add to backend/.env
REDIS_URL=redis://localhost:6379

# 5. Restart backend server
# Redis should now connect!
```

## Verification

After setup, restart your backend server. You should see:
```
✅ Redis client connected
```

Instead of:
```
⚠️ Redis not available (caching disabled)
```

---

**Note:** Redis is optional. The app works perfectly without it, just without caching benefits.

