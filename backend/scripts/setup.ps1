# Alyne Backend Setup Script (PowerShell)
# This script helps set up the backend environment

Write-Host "Setting up Alyne Backend..." -ForegroundColor Green

# Check if .env exists
if (-Not (Test-Path .env)) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "Please edit .env file with your configuration values" -ForegroundColor Yellow
} else {
    Write-Host ".env file already exists, skipping..." -ForegroundColor Green
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Green
pnpm install

# Approve build scripts for Prisma and bcrypt
Write-Host "Approving build scripts..." -ForegroundColor Green
pnpm approve-builds @prisma/client @prisma/engines bcrypt prisma

# Generate Prisma Client
Write-Host "Generating Prisma Client..." -ForegroundColor Green
pnpm exec prisma generate

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Green
Write-Host "Make sure your DATABASE_URL is configured in .env" -ForegroundColor Yellow
pnpm exec prisma migrate dev --name init

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Run 'pnpm run dev' to start the development server" -ForegroundColor Cyan

