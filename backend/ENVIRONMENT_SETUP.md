# Environment Setup Guide

## Overview
This guide provides detailed instructions for setting up environment variables and configuring the Alyne application for different environments.

## Quick Start

```powershell
# Backend
cd backend
Copy-Item .env.example .env
# Edit .env with your values

# Mobile
cd ..\mobile
Copy-Item .env.example .env
# Edit .env with your values
```

## Backend Environment Variables

### Required Variables

#### Server Configuration
```env
NODE_ENV=development  # or production, staging
PORT=3000
FRONTEND_URL=http://localhost:8081  # or production URL(s), comma-separated for multiple
```

#### Database
```env
DATABASE_URL=postgresql://user:password@localhost:5432/alyne?schema=public
```

**Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=[schema]
```

**Examples:**
- Local: `postgresql://postgres:password@localhost:5432/alyne?schema=public`
- Supabase: `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`
- AWS RDS: `postgresql://admin:password@your-db.region.rds.amazonaws.com:5432/alyne`

#### Redis (Optional but Recommended)
```env
REDIS_URL=redis://localhost:6379
```

**Examples:**
- Local: `redis://localhost:6379`
- Redis Cloud: `redis://default:password@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345`
- Upstash: `redis://default:password@your-redis.upstash.io:6379`

#### Authentication
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-characters
JWT_EXPIRES_IN=7d
```

**Generate JWT Secret:**
```powershell
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Or use OpenSSL
openssl rand -base64 32
```

#### Payment Processing (Stripe)
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

**Getting Stripe Keys:**
1. Sign up at [stripe.com](https://stripe.com)
2. Go to Developers > API keys
3. Copy test keys for development
4. Use live keys for production

#### Bank Integration (Plaid)
```env
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox  # or development, production
```

**Getting Plaid Keys:**
1. Sign up at [plaid.com](https://plaid.com)
2. Go to Team Settings > Keys
3. Copy Client ID and Secret
4. Use sandbox for development, production for live

#### Platform Configuration
```env
PLATFORM_FEE_PERCENTAGE=10  # Platform fee as percentage (e.g., 10 = 10%)
```

### Optional Variables

#### Email Configuration
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=your_resend_api_key
EMAIL_FROM=noreply@alyne.com
```

**Resend Setup (Recommended - 3,000 emails/month free):**
1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys and create a new key
3. Verify your domain (or use their test domain for development)
4. Use the API key in `SMTP_PASS`

**Brevo (Sendinblue) Setup (300 emails/day free):**
```env
SMTP_HOST=smtp.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_email@example.com
SMTP_PASS=your_brevo_smtp_key
EMAIL_FROM=noreply@alyne.com
```

**Mailgun Setup (1,000 emails/month free after trial):**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your_mailgun_smtp_password
EMAIL_FROM=noreply@alyne.com
```

**Gmail Setup (for development only):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@alyne.com
```
1. Enable 2-factor authentication
2. Generate app password: [Google Account Settings](https://myaccount.google.com/apppasswords)
3. Use app password in `SMTP_PASS`

#### Google OAuth (Optional)
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

#### Error Tracking (Sentry)
```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

#### Logging
```env
LOG_LEVEL=debug  # or info, warn, error
```

#### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5
```

## Mobile Environment Variables

### Required Variables

#### API Configuration
```env
API_BASE_URL=http://localhost:3000/api  # or production URL
```

#### Stripe
```env
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

#### Plaid (for bank account linking)
```env
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_ENV=sandbox  # or development, production
```

### Optional Variables

#### Google Maps
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

#### Firebase (if using)
```env
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
```

## Environment-Specific Configurations

### Development

**Backend `.env`:**
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:8081
DATABASE_URL=postgresql://postgres:password@localhost:5432/alyne_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key-change-in-production
STRIPE_SECRET_KEY=sk_test_...
PLAID_ENV=sandbox
LOG_LEVEL=debug
```

**Mobile `.env`:**
```env
API_BASE_URL=http://localhost:3000/api
STRIPE_PUBLISHABLE_KEY=pk_test_...
PLAID_ENV=sandbox
```

### Staging

**Backend `.env`:**
```env
NODE_ENV=staging
PORT=3000
FRONTEND_URL=https://staging.alyne.com
DATABASE_URL=postgresql://user:password@staging-db:5432/alyne_staging
REDIS_URL=redis://staging-redis:6379
JWT_SECRET=staging-secret-key
STRIPE_SECRET_KEY=sk_test_...  # Still use test keys
PLAID_ENV=development
LOG_LEVEL=info
```

### Production

**Backend `.env`:**
```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://alyne.com,https://www.alyne.com
DATABASE_URL=postgresql://user:password@prod-db:5432/alyne
REDIS_URL=redis://prod-redis:6379
JWT_SECRET=production-secret-key-min-32-characters-random
STRIPE_SECRET_KEY=sk_live_...  # Live keys
PLAID_ENV=production
LOG_LEVEL=warn
SENTRY_DSN=https://...
```

**Mobile `.env`:**
```env
API_BASE_URL=https://api.alyne.com/api
STRIPE_PUBLISHABLE_KEY=pk_live_...
PLAID_ENV=production
```

## Setting Up Third-Party Services

### PostgreSQL Database

#### Local Setup
```powershell
# Install PostgreSQL
# Download from https://www.postgresql.org/download/windows/

# Create database
psql -U postgres
CREATE DATABASE alyne;
CREATE USER alyne_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE alyne TO alyne_user;
```

#### Cloud Options
- **Supabase**: Free tier available, easy setup
- **Neon**: Serverless PostgreSQL
- **AWS RDS**: Managed PostgreSQL
- **Railway**: Includes PostgreSQL in free tier

### Redis

#### Local Setup

**Option 1: Docker (Recommended)**
```powershell
# Pull and run Redis
docker run -d --name redis-alyne -p 6379:6379 redis:7-alpine

# Verify it's running
docker ps
```

**Option 2: WSL2**
```powershell
# Open WSL
wsl

# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis
sudo service redis-server start
```

**Option 3: Memurai (Windows Native)**
- Download from [Memurai.com](https://www.memurai.com/get-memurai)
- Install and run as Windows service

**See `REDIS_SETUP.md` for detailed instructions.**

#### Cloud Options
- **Redis Cloud**: Free tier available
- **Upstash**: Serverless Redis
- **AWS ElastiCache**: Managed Redis
- **Railway**: Includes Redis

### Stripe

1. **Create Account**: [stripe.com](https://stripe.com)
2. **Get API Keys**: Dashboard > Developers > API keys
3. **Test Mode**: Use test keys for development
4. **Webhooks**: Configure webhook endpoints for production

### Plaid

1. **Create Account**: [plaid.com](https://plaid.com)
2. **Get API Keys**: Dashboard > Team Settings > Keys
3. **Sandbox**: Use for development/testing
4. **Production**: Requires approval process

## Verification

### Test Backend Configuration

```powershell
cd backend

# Check environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"

# Test database connection
pnpm exec prisma db pull

# Test Redis connection (if configured)
node -e "require('dotenv').config(); const redis = require('redis'); const client = redis.createClient({url: process.env.REDIS_URL}); client.connect().then(() => console.log('Redis connected')).catch(console.error)"
```

### Test Mobile Configuration

```powershell
cd mobile

# Check environment variables
node -e "require('dotenv').config(); console.log(process.env.API_BASE_URL)"
```

## Security Best Practices

1. **Never commit `.env` files**
   - Already in `.gitignore`
   - Use `.env.example` for documentation

2. **Use different secrets for each environment**
   - Development, staging, production should have different keys

3. **Rotate secrets regularly**
   - JWT secrets: Every 90 days
   - API keys: Every 180 days or when compromised

4. **Use secrets management in production**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Platform-specific (Railway, Render, etc.)

5. **Limit access to production secrets**
   - Only authorized personnel
   - Use environment-specific access controls

## Troubleshooting

### Environment Variables Not Loading

**Issue**: Variables not accessible in code

**Solutions**:
- Verify `.env` file is in correct directory
- Check file name (`.env` not `env` or `.env.local`)
- Restart application after changes
- Verify `dotenv` is configured: `dotenv.config()` in entry file

### Database Connection Errors

**Issue**: Cannot connect to database

**Solutions**:
- Verify `DATABASE_URL` format is correct
- Check database is running
- Verify credentials are correct
- Check firewall/network access
- Test connection: `psql $DATABASE_URL`

### Redis Connection Errors

**Issue**: Redis connection fails

**Solutions**:
- Verify `REDIS_URL` format
- Check Redis is running
- Verify credentials
- App will continue without Redis (graceful degradation)

### API Keys Not Working

**Issue**: Stripe/Plaid API calls fail

**Solutions**:
- Verify keys are correct (no extra spaces)
- Check key type (test vs live)
- Verify environment matches key type
- Check API key permissions in dashboard

## Environment Variable Reference

See `.env.example` files in:
- `backend/.env.example`
- `mobile/.env.example`

For complete list of all available environment variables.

---

**Last Updated:** November 2024

