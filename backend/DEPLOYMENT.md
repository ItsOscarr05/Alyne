# Deployment Guide

## Overview
This guide covers deploying the Alyne application to production environments.

## Prerequisites

### Required Services
- **PostgreSQL Database**: Production database (AWS RDS, Supabase, or similar)
- **Redis**: For caching (AWS ElastiCache, Redis Cloud, or similar)
- **Stripe Account**: Production Stripe account with API keys
- **Plaid Account**: Production Plaid account with API keys
- **Domain Name**: For production API and frontend
- **SSL Certificate**: For HTTPS (Let's Encrypt or similar)

### Infrastructure Options
- **Backend**: AWS EC2, Heroku, Railway, Render, DigitalOcean
- **Database**: AWS RDS, Supabase, Neon, PlanetScale
- **Redis**: AWS ElastiCache, Redis Cloud, Upstash
- **Frontend**: Vercel, Netlify, AWS Amplify, Expo EAS

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] SSL certificate obtained
- [ ] Domain DNS configured
- [ ] Stripe production keys obtained
- [ ] Plaid production keys obtained
- [ ] Error tracking (Sentry) configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Security audit completed

## Backend Deployment

### Option 1: Railway

1. **Create Railway Account**
   - Sign up at [railway.app](https://railway.app)

2. **Create New Project**
   ```powershell
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Initialize project
   cd backend
   railway init
   ```

3. **Add Services**
   - PostgreSQL database
   - Redis instance
   - Backend service

4. **Configure Environment Variables**
   - Add all variables from `.env.example`
   - Set `NODE_ENV=production`
   - Configure production URLs

5. **Deploy**
   ```powershell
   railway up
   ```

### Option 2: Render

1. **Create Render Account**
   - Sign up at [render.com](https://render.com)

2. **Create Web Service**
   - Connect GitHub repository
   - Set build command: `pnpm install && pnpm build`
   - Set start command: `pnpm start`
   - Set environment: `Node`

3. **Add PostgreSQL Database**
   - Create new PostgreSQL database
   - Copy connection string to environment variables

4. **Add Redis Instance**
   - Create new Redis instance
   - Copy connection URL to environment variables

5. **Configure Environment Variables**
   - Add all required variables
   - Set `NODE_ENV=production`

### Option 3: AWS EC2

1. **Launch EC2 Instance**
   ```powershell
   # Use Ubuntu 22.04 LTS
   # Instance type: t3.small or larger
   # Security group: Allow ports 22, 80, 443, 3000
   ```

2. **SSH into Instance**
   ```powershell
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install pnpm
   npm install -g pnpm
   
   # Install PM2 for process management
   npm install -g pm2
   ```

4. **Clone and Setup**
   ```bash
   # Clone repository
   git clone your-repo-url
   cd Alyne/backend
   
   # Install dependencies
   pnpm install
   
   # Build
   pnpm build
   
   # Set up environment
   cp .env.example .env
   nano .env  # Edit with production values
   ```

5. **Run Database Migrations**
   ```bash
   pnpm exec prisma migrate deploy
   pnpm exec prisma generate
   ```

6. **Start with PM2**
   ```bash
   pm2 start dist/index.js --name alyne-backend
   pm2 save
   pm2 startup  # Follow instructions to enable on boot
   ```

7. **Setup Nginx Reverse Proxy**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/alyne
   ```

   Nginx configuration:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/alyne /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

8. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

## Frontend Deployment

### Option 1: Expo EAS Build

1. **Install EAS CLI**
   ```powershell
   npm install -g eas-cli
   ```

2. **Configure EAS**
   ```powershell
   cd mobile
   eas build:configure
   ```

3. **Build for Production**
   ```powershell
   # iOS
   eas build --platform ios --profile production
   
   # Android
   eas build --platform android --profile production
   ```

4. **Submit to App Stores**
   ```powershell
   # iOS App Store
   eas submit --platform ios
   
   # Google Play Store
   eas submit --platform android
   ```

### Option 2: Web Deployment (Vercel/Netlify)

1. **Build Web Version**
   ```powershell
   cd mobile
   pnpm build:web
   ```

2. **Deploy to Vercel**
   ```powershell
   npm i -g vercel
   vercel --prod
   ```

3. **Configure Environment Variables**
   - Add all required variables in Vercel dashboard
   - Set `API_BASE_URL` to production backend URL

## Database Setup

### Production Database Migration

```powershell
cd backend

# Set production DATABASE_URL
$env:DATABASE_URL = "postgresql://user:password@host:5432/database"

# Run migrations
pnpm exec prisma migrate deploy

# Generate Prisma Client
pnpm exec prisma generate
```

### Database Backup Strategy

```powershell
# Automated backups (cron job or scheduled task)
# Daily backup script
pg_dump $DATABASE_URL > backup_$(Get-Date -Format "yyyy-MM-dd").sql

# Restore from backup
psql $DATABASE_URL < backup_2024-11-29.sql
```

## Environment Variables

### Production `.env` Template

```env
# Server
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com,https://www.yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://host:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=7d

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Plaid (Production)
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=production

# Platform
PLATFORM_FEE_PERCENTAGE=10

# Error Tracking
SENTRY_DSN=your_sentry_dsn

# Email (Optional)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

## Post-Deployment

### 1. Verify Deployment

```powershell
# Health check
Invoke-WebRequest -Uri "https://api.yourdomain.com/health"

# API docs
Start-Process "https://api.yourdomain.com/api-docs"
```

### 2. Set Up Monitoring

- Configure UptimeRobot or similar to ping `/health` endpoint
- Set up Sentry error tracking
- Configure log aggregation (CloudWatch, Datadog, etc.)

### 3. Set Up CI/CD

#### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm build
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Rollback Procedure

### If Deployment Fails

1. **Database Rollback**
   ```powershell
   cd backend
   pnpm exec prisma migrate resolve --rolled-back <migration-name>
   ```

2. **Application Rollback**
   - Revert to previous Git commit
   - Redeploy previous version
   - Or use platform-specific rollback (Railway, Render, etc.)

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (AWS ALB, Cloudflare)
- Multiple backend instances
- Database connection pooling
- Redis for session storage

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize database queries
- Enable caching aggressively

## Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] API keys rotated
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Security headers configured (Helmet)
- [ ] Error tracking configured (Sentry)
- [ ] Logs not exposing sensitive data
- [ ] Regular security updates

## Maintenance

### Regular Tasks
- Monitor error rates
- Review slow queries
- Update dependencies
- Rotate API keys (quarterly)
- Review and update documentation
- Backup database (daily)

### Updates
```powershell
# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Run migrations
pnpm exec prisma migrate deploy

# Rebuild
pnpm build

# Restart service
pm2 restart alyne-backend  # If using PM2
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` format
   - Verify database is accessible
   - Check firewall rules

2. **Redis Connection Errors**
   - Verify `REDIS_URL` is correct
   - Check Redis instance is running
   - App will continue without Redis (graceful degradation)

3. **Build Failures**
   - Check Node.js version (18+)
   - Verify all dependencies installed
   - Check TypeScript compilation errors

4. **Environment Variables Not Loading**
   - Verify `.env` file exists
   - Check variable names match exactly
   - Restart application after changes

## Support

For deployment issues, refer to:
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Environment Setup Guide](./ENVIRONMENT_SETUP.md)
- Platform-specific documentation

---

**Last Updated:** November 2024

