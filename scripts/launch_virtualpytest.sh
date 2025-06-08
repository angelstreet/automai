#!/bin/bash

# VirtualPyTest Launch Script - Simple Unified Logging
echo "🚀 Starting VirtualPyTest System with Unified Logging..."

# Activate virtual environment
source /home/sunri-pi1/myvenv/bin/activate
cd ~/automai/virtualpytest/src/web

# Colors for different services
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to run command with colored prefix
run_with_prefix() {
    local prefix="$1"
    local color="$2"
    shift 2
    "$@" 2>&1 | while IFS= read -r line; do
        echo -e "${color}[${prefix}]${NC} $line"
    done &
}

# Cleanup function
cleanup() {
    echo -e "\n${RED}🛑 Shutting down all services...${NC}"
    jobs -p | xargs -r kill 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "📺 Starting services with unified logging..."
echo "💡 Press Ctrl+C to stop all services"
echo "=================================================================================="

# Start all services with prefixed output
run_with_prefix "SERVER" "$BLUE" python app_server.py
sleep 2

run_with_prefix "NPM" "$YELLOW" npm run dev
sleep 2

run_with_prefix "HOST" "$GREEN" python app_host.py

# Wait for all background jobs
wait