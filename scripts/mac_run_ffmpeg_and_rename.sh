#!/bin/bash

# Configuration for USB video capture
CAPTURE_DIR="/Users/$USER/Sites/stream/capture1"

# Create capture directory
mkdir -p "$CAPTURE_DIR/captures"
chmod -R 755 "$CAPTURE_DIR"

# Kill existing FFmpeg processes
pkill -f "ffmpeg.*avfoundation" 2>/dev/null && echo "Killed existing ffmpeg"

# FFmpeg command for USB video capture
/opt/homebrew/bin/ffmpeg -report -y \
  -vsync 1 -f avfoundation -framerate 5 -video_size 1920x1080 -i "0" \
  -fflags nobuffer+flush_packets \
  -avioflags direct \
  -probesize 32 \
  -analyzeduration 0 \
  -filter_complex "split=2[stream][capture];[stream]fps=5,scale=640:360,format=yuv420p[streamout];[capture]fps=5,format=yuv420p[captureout]" \
  -map "[streamout]" -c:v libx264 -preset ultrafast -tune zerolatency -b:v 500k -maxrate 600k -bufsize 1200k -g 10 -keyint_min 10 -sc_threshold 0 -flags low_delay+global_header -threads 2 -an -x264opts rc-lookahead=0:sync-lookahead=0:ref=1:bframes=1 \
    -f hls -hls_time 1 -hls_init_time 1 -hls_list_size 2 -hls_flags delete_segments+discont_start+split_by_time+independent_segments -hls_segment_type mpegts \
    -hls_allow_cache 0 -hls_segment_filename "$CAPTURE_DIR/segment_%03d.ts" \
    "$CAPTURE_DIR/output.m3u8" \
  -map "[captureout]" -c:v mjpeg -q:v 4 -r 4 -f image2 \
    "$CAPTURE_DIR/captures/test_capture_%06d.jpg" \
  > "/tmp/ffmpeg_output.log" 2>&1 &

FFMPEG_PID=$!
echo "Started FFmpeg with PID: $FFMPEG_PID"

# Start rename_captures.sh
/usr/local/bin/rename_captures.sh "$CAPTURE_DIR/captures" &
RENAME_PID=$!
echo "Started rename_captures.sh with PID: $RENAME_PID"

# Start clean_captures.sh in a loop
while true; do
  /usr/local/bin/clean_captures.sh "$CAPTURE_DIR/captures"
  sleep 300
done &
CLEAN_PID=$!
echo "Started clean_captures.sh with PID: $CLEAN_PID"

# Trap to clean up processes on exit
trap "kill $FFMPEG_PID $RENAME_PID $CLEAN_PID 2>/dev/null && echo 'Cleaned up processes'" SIGINT SIGTERM

# Keep script running
wait