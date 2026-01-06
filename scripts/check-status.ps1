# NFT Ticketing System - Status Check Script (PowerShell)

Write-Host "🔍 NFT Ticketing System Status Check" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check Hardhat node
Write-Host "⛓️ Blockchain (Hardhat): " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8545" -Method POST -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Running" -ForegroundColor Green
    } else {
        Write-Host "❌ Not responding" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Not running" -ForegroundColor Red
}

# Check Backend API
Write-Host "🔧 Backend API: " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Running" -ForegroundColor Green
    } else {
        Write-Host "❌ Not responding" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Not running" -ForegroundColor Red
}

# Check Frontend
Write-Host "🎨 Frontend: " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Running" -ForegroundColor Green
    } else {
        Write-Host "❌ Not responding" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Not running" -ForegroundColor Red
}

# Check MongoDB
Write-Host "📊 MongoDB: " -NoNewline
try {
    $mongoTest = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet
    if ($mongoTest) {
        Write-Host "✅ Running" -ForegroundColor Green
    } else {
        Write-Host "❌ Not running" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Not running" -ForegroundColor Red
}

Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "  Blockchain: http://localhost:8545" -ForegroundColor White
Write-Host ""











