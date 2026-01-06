#!/bin/bash

# NFT Ticketing System - Development Stop Script

echo "🛑 Stopping NFT Ticketing System Development Environment"
echo "====================================================="

# Stop Hardhat node
if [ -f .hardhat.pid ]; then
    HARDHAT_PID=$(cat .hardhat.pid)
    if kill -0 $HARDHAT_PID 2>/dev/null; then
        echo "⛓️ Stopping Hardhat node (PID: $HARDHAT_PID)..."
        kill $HARDHAT_PID
        echo "✅ Hardhat node stopped"
    fi
    rm .hardhat.pid
fi

# Stop backend
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "🔧 Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        echo "✅ Backend stopped"
    fi
    rm .backend.pid
fi

# Stop frontend
if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "🎨 Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        echo "✅ Frontend stopped"
    fi
    rm .frontend.pid
fi

# Stop MongoDB container
echo "📊 Stopping MongoDB container..."
docker stop mongodb 2>/dev/null || echo "MongoDB container not running"
docker rm mongodb 2>/dev/null || echo "MongoDB container not found"

# Clean up log files
rm -f hardhat.log

echo ""
echo "✅ All services stopped successfully!"
echo "====================================================="











