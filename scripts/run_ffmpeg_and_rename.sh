#!/bin/bash

# Function to kill existing processes
kill_existing_processes() {
  echo "Checking for existing processes..."
  pkill -f "ffmpeg.*v4l2.*output.m3u8" 2>/dev/null && echo "Killed existing ffmpeg"
  pkill -f "rename_captures.sh" 2>/dev/null && echo "Killed existing rename_captures.sh"
  pkill -f "clean_captures.sh" 2>/dev/null && echo "Killed existing clean_captures.sh"
}

# Cleanup function to kill background processes
cleanup() {
  echo "Caught signal, cleaning up..."
  # Kill background processes if their PIDs exist
  [ -n "$FFMPEG_PID" ] && kill "$FFMPEG_PID" 2>/dev/null && echo "Killed ffmpeg (PID: $FFMPEG_PID)"
  [ -n "$RENAME_PID" ] && kill "$RENAME_PID" 2>/dev/null && echo "Killed rename_captures.sh (PID: $RENAME_PID)"
  [ -n "$CLEAN_PID" ] && kill "$CLEAN_PID" 2>/dev/null && echo "Killed clean_captures.sh (PID: $CLEAN_PID)"
  exit 0
}

# Set up trap to catch Ctrl+C (SIGINT) and SIGTERM
trap cleanup SIGINT SIGTERM

# Kill any existing processes before starting
kill_existing_processes

CAPTURE_DIR="/var/www/html/stream/captures"
VIDEO_DEVICE="/dev/video0"

# Optimized FFMPEG command for low latency streaming
FFMPEG_CMD="/usr/bin/ffmpeg -y -f v4l2 -input_format mjpeg -framerate 5 -video_size 1920x1080 -i $VIDEO_DEVICE \
  -fflags nobuffer \
  -filter_complex split=2[stream][capture]\;[stream]scale=640:360,format=yuv420p[streamout]\;[capture]fps=5[captureout] \
  -map [streamout] -c:v libx264 -preset ultrafast -tune zerolatency -b:v 500k -maxrate 600k -bufsize 600k -g 15 -flags low_delay -threads 2 -an \
    -f hls -hls_time 3 -hls_list_size 4 -hls_flags delete_segments+discont_start+split_by_time -hls_segment_type mpegts -hls_init_time 1 \
    /var/www/html/stream/output.m3u8 \
  -map [captureout] -c:v mjpeg -q:v 4 -r 4 -f image2 \
    /var/www/html/stream/captures/test_capture_%06d.jpg"

RENAME_SCRIPT="/usr/local/bin/rename_captures.sh"
CLEAN_SCRIPT="/usr/local/bin/clean_captures.sh"

# Start ffmpeg with proper error handling
echo "Starting ffmpeg..."
eval $FFMPEG_CMD > /tmp/ffmpeg_output.log 2>&1 &
FFMPEG_PID=$!
echo "Started ffmpeg with PID: $FFMPEG_PID"

# Start rename script and capture its PID
$RENAME_SCRIPT &
RENAME_PID=$!
echo "Started rename_captures.sh with PID: $RENAME_PID"

# Start clean script in a loop and capture its PID
while true; do
  $CLEAN_SCRIPT
  sleep 300
done &
CLEAN_PID=$!
echo "Started clean_captures.sh loop with PID: $CLEAN_PID"

# Wait for all background processes
wait