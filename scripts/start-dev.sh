#!/bin/bash

# NFT Ticketing System - Development Startup Script

echo "🚀 Starting NFT Ticketing System Development Environment"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running
echo "📊 Checking MongoDB connection..."
if ! nc -z localhost 27017 2>/dev/null; then
    echo "⚠️ MongoDB is not running. Starting MongoDB with Docker..."
    docker run -d -p 27017:27017 --name mongodb mongo:latest
    echo "✅ MongoDB started"
else
    echo "✅ MongoDB is already running"
fi

# Start Hardhat node in background
echo "⛓️ Starting Hardhat blockchain..."
npx hardhat node > hardhat.log 2>&1 &
HARDHAT_PID=$!
echo "✅ Hardhat node started (PID: $HARDHAT_PID)"

# Wait for Hardhat to start
echo "⏳ Waiting for blockchain to be ready..."
sleep 5

# Deploy contract
echo "📋 Deploying smart contract..."
npx hardhat run scripts/deploy.js --network localhost

# Start backend
echo "🔧 Starting backend server..."
cd backend
npm install
npm run dev &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
cd ..

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"
cd ..

echo ""
echo "🎉 Development environment is ready!"
echo "=================================================="
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:5000"
echo "⛓️ Blockchain: http://localhost:8545"
echo "📊 MongoDB: mongodb://localhost:27017/nft-ticketing"
echo ""
echo "📝 Logs:"
echo "  - Hardhat: hardhat.log"
echo "  - Backend: Check terminal"
echo "  - Frontend: Check terminal"
echo ""
echo "🛑 To stop all services, run: ./scripts/stop-dev.sh"
echo ""

# Save PIDs for cleanup
echo $HARDHAT_PID > .hardhat.pid
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid











