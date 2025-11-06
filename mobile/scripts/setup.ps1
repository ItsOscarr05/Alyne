# Alyne Mobile App Setup Script (PowerShell)
# This script helps set up the mobile app environment

Write-Host "Setting up Alyne Mobile App..." -ForegroundColor Green

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

# Create placeholder assets if they don't exist
$assetsDir = Join-Path $PSScriptRoot "..\assets"
if (-Not (Test-Path (Join-Path $assetsDir "icon.png"))) {
    Write-Host "Creating placeholder assets..." -ForegroundColor Green
    node scripts/create-assets.js
} else {
    Write-Host "Assets already exist, skipping creation..." -ForegroundColor Green
}

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Run 'pnpm start' to start the Expo development server" -ForegroundColor Cyan

