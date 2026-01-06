# NFT Ticketing System - Development Stop Script (PowerShell)

Write-Host "🛑 Stopping NFT Ticketing System Development Environment" -ForegroundColor Red
Write-Host "=====================================================" -ForegroundColor Red

# Stop Hardhat node
$hardhatProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*hardhat*" }
if ($hardhatProcesses) {
    Write-Host "⛓️ Stopping Hardhat node..." -ForegroundColor Yellow
    $hardhatProcesses | Stop-Process -Force
    Write-Host "✅ Hardhat node stopped" -ForegroundColor Green
}

# Stop backend and frontend processes
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*npm*" }
if ($nodeProcesses) {
    Write-Host "🔧 Stopping Node.js processes..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Write-Host "✅ Node.js processes stopped" -ForegroundColor Green
}

# Stop MongoDB container
Write-Host "📊 Stopping MongoDB container..." -ForegroundColor Yellow
try {
    docker stop mongodb 2>$null
    docker rm mongodb 2>$null
    Write-Host "✅ MongoDB container stopped" -ForegroundColor Green
} catch {
    Write-Host "⚠️ MongoDB container not found or already stopped" -ForegroundColor Yellow
}

# Clean up log files
if (Test-Path "hardhat.log") {
    Remove-Item "hardhat.log" -Force
    Write-Host "✅ Log files cleaned up" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ All services stopped successfully!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green











