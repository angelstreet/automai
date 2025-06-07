#!/bin/bash

# VirtualPyTest Launch Script
# This script starts the VirtualPyTest system with proper process management

echo "🚀 Starting VirtualPyTest System..."

# Activate virtual environment
echo "📦 Activating virtual environment..."
source /home/sunri-pi1/myvenv/bin/activate

# Change to the web directory
cd ~/automai/virtualpytest/src/web

# Function to cleanup background processes on exit
cleanup() {
    echo "🧹 Cleaning up background processes..."
    if [ ! -z "$SERVER_PID" ]; then
        echo "🛑 Stopping server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null
    fi
    if [ ! -z "$NPM_PID" ]; then
        echo "🛑 Stopping npm dev server (PID: $NPM_PID)..."
        kill $NPM_PID 2>/dev/null
    fi
    echo "✅ Cleanup completed"
    exit 0
}

# Set up signal handlers for cleanup
trap cleanup SIGINT SIGTERM

# Start the server in background
echo "🖥️  Starting VirtualPyTest server..."
python app.py --server &
SERVER_PID=$!
echo "📍 Server started with PID: $SERVER_PID"

# Start npm dev server in background
echo "⚛️  Starting npm dev server..."
npm run dev &
NPM_PID=$!
echo "📍 NPM dev server started with PID: $NPM_PID"

# Wait a moment for server to start
echo "⏳ Waiting for server to initialize..."
sleep 3

# Start the host (this will run in foreground)
echo "🏠 Starting VirtualPyTest host..."
echo "💡 Press Ctrl+C to stop all services"
python app.py --host

# If we reach here, the host process ended, so cleanup
cleanup