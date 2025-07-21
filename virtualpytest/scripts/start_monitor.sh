#!/bin/bash
"""
Start Capture Monitor Service
Simple script to start the standalone capture monitoring service
"""

SCRIPT_DIR="/home/sunri-pi1/automai/virtualpytest/scripts"
VENV_PATH="/home/sunri-pi1/myvenv/bin/activate"
LOG_FILE="/tmp/capture_monitor.log"

echo "Starting Capture Monitor Service..."

# Check if already running
if pgrep -f "capture_monitor.py" >/dev/null 2>&1; then
    echo "Capture monitor is already running!"
    pgrep -f "capture_monitor.py"
    exit 0
fi

# Start the service
echo "Starting capture monitor service..."
echo "Logs: $LOG_FILE"

(
    source "$VENV_PATH" && \
    cd "$SCRIPT_DIR" && \
    python capture_monitor.py
) >> "$LOG_FILE" 2>&1 &

MONITOR_PID=$!
echo "Capture monitor started with PID: $MONITOR_PID"

# Wait a moment and check if it's still running
sleep 2
if kill -0 $MONITOR_PID 2>/dev/null; then
    echo "✅ Capture monitor service is running successfully"
    echo "   PID: $MONITOR_PID"
    echo "   Logs: tail -f $LOG_FILE"
else
    echo "❌ Capture monitor service failed to start"
    echo "   Check logs: $LOG_FILE"
    exit 1
fi 