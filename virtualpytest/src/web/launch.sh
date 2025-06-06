#!/bin/bash

# VirtualPyTest Development Server Launcher
# Kills existing servers and starts Flask server + Vite dev server

echo "🔄 Starting VirtualPyTest Development Environment..."

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local service_name=$2
    
    echo "🔍 Checking for processes on port $port ($service_name)..."
    
    # Find and kill processes on the port (more aggressive approach)
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        echo "💀 Killing existing $service_name processes on port $port..."
        # First try SIGTERM
        echo "$pids" | xargs kill 2>/dev/null
        sleep 2
        
        # Check if still running, then force kill
        local remaining_pids=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$remaining_pids" ]; then
            echo "🔨 Force killing stubborn processes..."
            echo "$remaining_pids" | xargs kill -9 2>/dev/null
            sleep 1
        fi
        echo "✅ $service_name processes stopped"
    else
        echo "✅ No existing processes found on port $port"
    fi
}

# Store PIDs for cleanup
FLASK_SERVER_PID=""
VITE_PID=""
CLIENT_PID=""

# Cleanup function for script exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    
    if [ ! -z "$FLASK_SERVER_PID" ]; then
        kill $FLASK_SERVER_PID 2>/dev/null
    fi
    
    if [ ! -z "$VITE_PID" ]; then
        kill $VITE_PID 2>/dev/null
    fi
    
    if [ ! -z "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null
    fi
    
    # Kill by port as backup
    kill_port 5009 "Flask Server"
    kill_port 5109 "Flask Client"
    kill_port 5073 "Vite Dev Server"
    
    echo "✅ All services stopped!"
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Kill existing servers
echo ""
echo "🧹 Cleaning up existing processes..."
kill_port 5009 "Flask Server"
kill_port 5109 "Flask Client" 
kill_port 5073 "Vite Dev Server"

# Wait a moment for processes to fully terminate
sleep 2

echo ""
echo "🚀 Starting servers..."

# Start Flask server in background
echo "📡 Starting Flask Server on port 5009..."
python app.py --server > flask-server.log 2>&1 &
FLASK_SERVER_PID=$!

# Wait a moment for Flask server to start
sleep 3

# Start Vite dev server in background
echo "⚡ Starting Vite Dev Server on port 5073..."
npm run dev > vite-dev.log 2>&1 &
VITE_PID=$!

# Wait a moment for Vite to start
sleep 3

echo ""
echo "✅ Development environment started!"
echo ""
echo "📊 Services running:"
echo "   🖥️  Flask Server:    http://localhost:5009"
echo "   ⚡ Vite Dev Server:  http://localhost:5073"
echo ""
echo "📝 Logs:"
echo "   Flask Server: tail -f flask-server.log"
echo "   Vite Dev:     tail -f vite-dev.log"
echo ""
echo "🛑 To stop: Press Ctrl+C"
echo ""

# Optional: Start a Flask client for testing
read -p "🤖 Start a test client on port 5109? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📱 Starting Flask Client on port 5109..."
    python app.py --client > flask-client.log 2>&1 &
    CLIENT_PID=$!
    echo "   📱 Flask Client:     http://localhost:5109"
    echo "   Client logs:         tail -f flask-client.log"
fi

echo ""
echo "🎉 Ready for development!"
echo "   Open http://localhost:5073 in your browser"
echo ""
echo "💡 Press Ctrl+C to stop all services"

# Keep script running and wait for user to stop
while true; do
    sleep 1
done