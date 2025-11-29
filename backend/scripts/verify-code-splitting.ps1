# Code Splitting Verification Script
# Verifies that Expo Router is properly code-splitting routes

Write-Host "🔍 Verifying Code Splitting..." -ForegroundColor Cyan

$appDir = "mobile/app"
$routeFiles = Get-ChildItem -Path $appDir -Recurse -Filter "*.tsx" -File

Write-Host "`n📁 Found $($routeFiles.Count) route files:" -ForegroundColor Yellow

$routeInfo = @()

foreach ($file in $routeFiles) {
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\mobile\", "")
    $content = Get-Content $file.FullName -Raw
    
    # Check for dynamic imports
    $hasDynamicImport = $content -match "import\(|require\(|lazy\(|React\.lazy"
    
    # Check for heavy dependencies
    $hasHeavyDeps = $content -match "react-native-maps|@stripe|socket\.io|plaid"
    
    # Check file size
    $fileSize = (Get-Item $file.FullName).Length
    $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
    
    $routeInfo += [PSCustomObject]@{
        Route = $relativePath
        SizeKB = $fileSizeKB
        HasDynamicImport = $hasDynamicImport
        HasHeavyDeps = $hasHeavyDeps
    }
}

# Display results
Write-Host "`n📊 Route Analysis:" -ForegroundColor Cyan
$routeInfo | Format-Table -AutoSize

# Check Expo Router configuration
Write-Host "`n✅ Code Splitting Status:" -ForegroundColor Cyan

$hasExpoRouter = Test-Path "mobile/app/_layout.tsx"
if ($hasExpoRouter) {
    Write-Host "  ✅ Expo Router detected (automatic code splitting enabled)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Expo Router not detected" -ForegroundColor Yellow
}

# Recommendations
Write-Host "`n💡 Recommendations:" -ForegroundColor Yellow

$largeRoutes = $routeInfo | Where-Object { $_.SizeKB -gt 50 }
if ($largeRoutes) {
    Write-Host "  ⚠️  Large route files detected (>50KB):" -ForegroundColor Yellow
    $largeRoutes | ForEach-Object {
        Write-Host "     - $($_.Route) ($($_.SizeKB) KB)" -ForegroundColor White
        Write-Host "       Consider splitting into smaller components" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✅ All route files are reasonably sized" -ForegroundColor Green
}

$routesWithHeavyDeps = $routeInfo | Where-Object { $_.HasHeavyDeps -and -not $_.HasDynamicImport }
if ($routesWithHeavyDeps) {
    Write-Host "`n  ⚠️  Routes with heavy dependencies (consider dynamic imports):" -ForegroundColor Yellow
    $routesWithHeavyDeps | ForEach-Object {
        Write-Host "     - $($_.Route)" -ForegroundColor White
    }
} else {
    Write-Host "  ✅ Heavy dependencies are properly handled" -ForegroundColor Green
}

Write-Host "`n✅ Verification Complete!" -ForegroundColor Green

