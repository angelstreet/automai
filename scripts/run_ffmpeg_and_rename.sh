#!/bin/bash

# Configuration array for four grabbers
declare -A GRABBERS=(
  ["0"]="/dev/video0:/var/www/html/stream/capture1"
)

# Simple log reset function - truncates log if over 30MB
reset_log_if_large() {
  local logfile="$1"
  local max_size_mb=30
  
  # Check if log file exists and its size
  if [ -f "$logfile" ]; then
    local size_mb=$(du -m "$logfile" | cut -f1)
    if [ "$size_mb" -ge "$max_size_mb" ]; then
      echo "$(date): Log $logfile exceeded ${max_size_mb}MB, resetting..." >> "${logfile}"
      > "$logfile"  # Truncate the file
      echo "$(date): Log reset" >> "${logfile}"
    fi
  fi
}

# Function to kill existing processes for a specific grabber (simplified like older script)
kill_existing_processes() {
  local output_dir=$1
  local video_device=$2
  echo "Checking for existing processes for $video_device..."
  pkill -f "ffmpeg.*$video_device" 2>/dev/null && echo "Killed existing ffmpeg for $video_device"
  pkill -f "rename_captures.sh.*$output_dir" 2>/dev/null && echo "Killed existing rename_captures.sh for $output_dir"
  pkill -f "clean_captures.sh.*$output_dir" 2>/dev/null && echo "Killed existing clean_captures.sh for $output_dir"
}

# Cleanup function (similar to older script)
cleanup() {
  local ffmpeg_pid=$1
  local rename_pid=$2
  local clean_pid=$3
  local video_device=$4
  echo "Caught signal, cleaning up for $video_device..."
  [ -n "$ffmpeg_pid" ] && kill "$ffmpeg_pid" 2>/dev/null && echo "Killed ffmpeg (PID: $ffmpeg_pid)"
  [ -n "$rename_pid" ] && kill "$rename_pid" 2>/dev/null && echo "Killed rename_captures.sh (PID: $rename_pid)"
  [ -n "$clean_pid" ] && kill "$clean_pid" 2>/dev/null && echo "Killed clean_captures.sh (PID: $clean_pid)"
}

# Function to start processes for a single grabber (aligned with older script's structure)
start_grabber() {
  local video_device=$1
  local capture_dir=$2
  local index=$3

  # Create capture directory (same as older script)
  mkdir -p "$capture_dir/captures"

  # Kill existing processes (simplified like older script)
  kill_existing_processes "$capture_dir" "$video_device"

  # FFMPEG command (identical to older script, adapted for multi-grabber)
  FFMPEG_CMD="/usr/bin/ffmpeg -y -f v4l2 -input_format mjpeg -framerate 10 -video_size 1920x1080 -timeout 5000000 -i $video_device \
    -fflags nobuffer+flush_packets \
    -avioflags direct \
    -probesize 32 \
    -analyzeduration 0 \
    -filter_complex split=2[stream][capture]\;[stream]scale=640:360,format=yuv420p[streamout]\;[capture]fps=2[captureout] \
    -map [streamout] -c:v libx264 -preset ultrafast -tune zerolatency -b:v 500k -maxrate 600k -bufsize 100k -g 5 -keyint_min 5 -sc_threshold 0 -flags low_delay+global_header -threads 2 -an -x264opts rc-lookahead=0:sync-lookahead=0:ref=1:bframes=0 \
      -f hls -hls_time 0.5 -hls_list_size 2 -hls_flags delete_segments+discont_start+split_by_time+independent_segments -hls_segment_type mpegts -hls_init_time 0.5 \
      -hls_allow_cache 0 -hls_segment_filename $capture_dir/segment_%03d.ts \
      $capture_dir/output.m3u8 \
    -map [captureout] -c:v mjpeg -q:v 4 -r 2 -f image2 \
      $capture_dir/captures/test_capture_%06d.jpg"

  # Start ffmpeg (same as older script)
  echo "Starting ffmpeg for $video_device..."
  local FFMPEG_LOG="/tmp/ffmpeg_output_${index}.log"
  reset_log_if_large "$FFMPEG_LOG"
  eval $FFMPEG_CMD > "$FFMPEG_LOG" 2>&1 &
  local FFMPEG_PID=$!
  echo "Started ffmpeg for $video_device with PID: $FFMPEG_PID"

  # Start rename script (same as older script)
  /usr/local/bin/rename_captures.sh &
  local RENAME_PID=$!
  echo "Started rename_captures.sh for $capture_dir with PID: $RENAME_PID"

  # Start clean script (same as older script)
  while true; do
    /usr/local/bin/clean_captures.sh
    sleep 300
  done &
  local CLEAN_PID=$!
  echo "Started clean_captures.sh loop for $capture_dir with PID: $CLEAN_PID"

  # Set up trap for this grabber (same as older script)
  trap "cleanup $FFMPEG_PID $RENAME_PID $CLEAN_PID $video_device" SIGINT SIGTERM
}

# Main loop to start all grabbers (adapted for four devices)
PIDS=()
for index in "${!GRABBERS[@]}"; do
  IFS=':' read -r video_device capture_dir <<< "${GRABBERS[$index]}"
  start_grabber "$video_device" "$capture_dir" "$index" &
  PIDS+=($!)
done

# Wait for all grabber processes (mimics older script's wait)
wait "${PIDS[@]}"

# Keep script alive (ensures systemd compatibility, not needed in older script but added for stability)
while true; do
  sleep 3600
done