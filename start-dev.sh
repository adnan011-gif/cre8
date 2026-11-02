#!/bin/bash

# Cre8Hub Development Startup Script
echo "🚀 Starting Cre8Hub Development Environment..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Node.js is installed
if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Function to start backend
start_backend() {
    echo "📦 Starting Backend Server..."
    cd Backend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📥 Installing backend dependencies..."
        npm install
    fi
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        echo "⚠️  .env file not found. Please copy env.example to .env and configure it."
        echo "   cp env.example .env"
        exit 1
    fi
    
    echo "🔧 Backend starting on http://localhost:5001"
    npm run dev &
    BACKEND_PID=$!
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "📦 Starting Frontend Server..."
    cd Frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📥 Installing frontend dependencies..."
        npm install
    fi
    
    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        echo "⚠️  .env.local file not found. Creating from env.example..."
        cp env.example .env.local
    fi
    
    echo "🔧 Frontend starting on http://localhost:8080"
    npm run dev &
    FRONTEND_PID=$!
    cd ..
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    echo "✅ Servers stopped."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start servers
start_backend
sleep 2
start_frontend

echo ""
echo "🎉 Cre8Hub is running!"
echo "   Frontend: http://localhost:8080"
echo "   Backend:  http://localhost:5001"
echo "   Health Check: http://localhost:5001/api/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for both processes
wait
