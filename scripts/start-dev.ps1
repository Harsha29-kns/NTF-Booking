# NFT Ticketing System - Development Startup Script (PowerShell)

Write-Host "🚀 Starting NFT Ticketing System Development Environment" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if MongoDB is running
Write-Host "📊 Checking MongoDB connection..." -ForegroundColor Yellow
try {
    $mongoTest = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet
    if (-not $mongoTest) {
        Write-Host "⚠️ MongoDB is not running. Starting MongoDB with Docker..." -ForegroundColor Yellow
        docker run -d -p 27017:27017 --name mongodb mongo:latest
        Write-Host "✅ MongoDB started" -ForegroundColor Green
    } else {
        Write-Host "✅ MongoDB is already running" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Could not check MongoDB status. Make sure Docker is running." -ForegroundColor Yellow
}

# Start Hardhat node in background
Write-Host "⛓️ Starting Hardhat blockchain..." -ForegroundColor Yellow
Start-Process -FilePath "npx" -ArgumentList "hardhat", "node" -WindowStyle Hidden -RedirectStandardOutput "hardhat.log" -RedirectStandardError "hardhat.log"
Start-Sleep -Seconds 3
Write-Host "✅ Hardhat node started" -ForegroundColor Green

# Wait for Hardhat to start
Write-Host "⏳ Waiting for blockchain to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Deploy contract
Write-Host "📋 Deploying smart contract..." -ForegroundColor Yellow
npx hardhat run scripts/deploy.js --network localhost
Write-Host "✅ Contract deployed" -ForegroundColor Green

# Start backend
Write-Host "🔧 Starting backend server..." -ForegroundColor Yellow
Set-Location backend
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal
Set-Location ..
Write-Host "✅ Backend started" -ForegroundColor Green

# Start frontend
Write-Host "🎨 Starting frontend..." -ForegroundColor Yellow
Set-Location frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal
Set-Location ..

Write-Host ""
Write-Host "🎉 Development environment is ready!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "⛓️ Blockchain: http://localhost:8545" -ForegroundColor Cyan
Write-Host "📊 MongoDB: mongodb://localhost:27017/nft-ticketing" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Logs:" -ForegroundColor Yellow
Write-Host "  - Hardhat: hardhat.log" -ForegroundColor White
Write-Host "  - Backend: Check new terminal window" -ForegroundColor White
Write-Host "  - Frontend: Check new terminal window" -ForegroundColor White
Write-Host ""
Write-Host "🛑 To stop services, close the terminal windows or run: .\scripts\stop-dev.ps1" -ForegroundColor Yellow
Write-Host ""











