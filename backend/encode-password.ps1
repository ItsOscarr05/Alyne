# Helper script to URL-encode your database password
# Usage: .\encode-password.ps1

Write-Host "`n=== Password URL Encoder ===" -ForegroundColor Cyan
Write-Host "Enter your Supabase database password:" -ForegroundColor Yellow
$password = Read-Host -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# URL encode the password
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($passwordPlain)

Write-Host "`n✅ Encoded password: $encodedPassword" -ForegroundColor Green
Write-Host "`nYour connection string should be:" -ForegroundColor Cyan
Write-Host "DATABASE_URL=postgresql://postgres:$encodedPassword@db.yubpexlhgguhdawxlsas.supabase.co:5432/postgres" -ForegroundColor White
Write-Host "`nCopy this and add it to backend/.env" -ForegroundColor Yellow

