# Bundle Size Analysis Script
# Analyzes the Expo bundle size and provides insights

Write-Host "📦 Analyzing Bundle Size..." -ForegroundColor Cyan

# Check if expo is installed
if (-not (Get-Command expo -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Expo CLI not found. Install with: pnpm add -g expo-cli" -ForegroundColor Red
    exit 1
}

# Export the bundle
Write-Host "`n🔨 Building production bundle..." -ForegroundColor Yellow
npx expo export --platform web --output-dir dist

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Bundle export failed" -ForegroundColor Red
    exit 1
}

# Analyze bundle size
Write-Host "`n📊 Analyzing bundle files..." -ForegroundColor Yellow

$bundleFiles = Get-ChildItem -Path "dist" -Recurse -File | Where-Object { $_.Extension -in @('.js', '.css', '.html') }

$totalSize = 0
$fileSizes = @()

foreach ($file in $bundleFiles) {
    $size = (Get-Item $file.FullName).Length
    $sizeKB = [math]::Round($size / 1KB, 2)
    $totalSize += $size
    $fileSizes += [PSCustomObject]@{
        File = $file.Name
        Path = $file.FullName.Replace((Get-Location).Path + "\", "")
        SizeKB = $sizeKB
        SizeMB = [math]::Round($sizeKB / 1024, 2)
    }
}

$totalSizeKB = [math]::Round($totalSize / 1KB, 2)
$totalSizeMB = [math]::Round($totalSizeKB / 1024, 2)

Write-Host "`n✅ Bundle Analysis Complete!" -ForegroundColor Green
Write-Host "`n📈 Summary:" -ForegroundColor Cyan
Write-Host "  Total Bundle Size: $totalSizeMB MB ($totalSizeKB KB)" -ForegroundColor White

# Show largest files
Write-Host "`n📋 Largest Files:" -ForegroundColor Cyan
$fileSizes | Sort-Object -Property SizeKB -Descending | Select-Object -First 10 | Format-Table -AutoSize

# Recommendations
Write-Host "`n💡 Recommendations:" -ForegroundColor Yellow

if ($totalSizeMB -gt 5) {
    Write-Host "  ⚠️  Bundle size is large (>5MB). Consider:" -ForegroundColor Yellow
    Write-Host "     - Code splitting" -ForegroundColor White
    Write-Host "     - Removing unused dependencies" -ForegroundColor White
    Write-Host "     - Using dynamic imports for heavy libraries" -ForegroundColor White
} else {
    Write-Host "  ✅ Bundle size is reasonable" -ForegroundColor Green
}

Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Review largest files above" -ForegroundColor White
Write-Host "  2. Check for unused dependencies: pnpm why <package>" -ForegroundColor White
Write-Host "  3. Consider lazy loading for large components" -ForegroundColor White
Write-Host "  4. Use expo-image for optimized image loading" -ForegroundColor White

