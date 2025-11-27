# Kill port 3000 script
param([int]$Port = 3000)

$processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess

if ($processes) {
    $processes | ForEach-Object { 
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        Write-Host "Killed process $_ on port $Port" -ForegroundColor Green
    }
} else {
    Write-Host "No process found on port $Port" -ForegroundColor Yellow
}

