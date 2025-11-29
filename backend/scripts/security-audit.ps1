# Security Audit Script
# Runs npm audit and checks for security vulnerabilities

Write-Host "🔒 Running Security Audit..." -ForegroundColor Cyan

# Run npm audit
Write-Host "`n📦 Checking npm dependencies..." -ForegroundColor Yellow
pnpm audit

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ No critical vulnerabilities found!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Vulnerabilities found. Review the output above." -ForegroundColor Yellow
    Write-Host "Run 'pnpm audit fix' to automatically fix issues, or 'pnpm audit fix --force' for breaking changes." -ForegroundColor Yellow
}

# Check for outdated packages
Write-Host "`n📊 Checking for outdated packages..." -ForegroundColor Yellow
pnpm outdated

# Check key rotation status
Write-Host "`n🔑 Checking API key rotation status..." -ForegroundColor Yellow
node -e "const { keyRotationManager } = require('./dist/utils/apiKeyRotation'); keyRotationManager.checkRotationReminders();"

Write-Host "`n✅ Security audit complete!" -ForegroundColor Green

