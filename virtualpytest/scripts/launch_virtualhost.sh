#!/bin/bash

# VirtualPyTest Host Client Launch Script
echo "🚀 Starting VirtualPyTest Host Client..."

# Get the script directory and navigate to the correct paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WEB_DIR="$PROJECT_ROOT/virtualpytest/src/web"

echo "📁 Script directory: $SCRIPT_DIR"
echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Web directory: $WEB_DIR"

# Detect Python executable
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ No Python executable found!"
    exit 1
fi
echo "🐍 Using Python: $PYTHON_CMD"

# Check if we have a virtual environment to activate
if [ -f "$PROJECT_ROOT/venv/bin/activate" ]; then
    echo "🐍 Activating virtual environment..."
    source "$PROJECT_ROOT/venv/bin/activate"
elif [ -f "$HOME/myvenv/bin/activate" ]; then
    echo "🐍 Activating virtual environment from home..."
    source "$HOME/myvenv/bin/activate"
else
    echo "⚠️  No virtual environment found, proceeding without activation"
fi

# Navigate to web directory
if [ -d "$WEB_DIR" ]; then
    cd "$WEB_DIR"
    echo "📂 Changed to: $(pwd)"
else
    echo "❌ Web directory not found: $WEB_DIR"
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Enhanced cleanup function
cleanup() {
    echo -e "\n${RED}🛑 Shutting down host client...${NC}"
    echo -e "${RED}✅ Host client stopped${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "📺 Starting Host Client..."
echo "💡 Press Ctrl+C to stop the host client"
echo "=================================================================================="

# Start only the host client
echo -e "${GREEN}🟢 Starting Host Client...${NC}"
$PYTHON_CMD -u app_host.py

echo "=================================================================================="
echo -e "${NC}✅ Host client finished${NC}"