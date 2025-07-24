#!/bin/bash

# Configuration array for grabbers: video_device|audio_device|capture_dir|fps
declare -A GRABBERS=(
  ["0"]="/dev/video0|plughw:2,0|/var/www/html/stream/capture1|10"
)

# Simple log reset function - truncates log if over 30MB
reset_log_if_large() {
  local logfile="$1" max_size_mb=30
  
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

# Function to kill existing processes for a specific grabber
kill_existing_processes() {
  local output_dir=$1 video_device=$2
  echo "Checking for existing processes for $video_device..."
  pkill -9 -f "ffmpeg.*$video_device" 2>/dev/null && echo "Killed existing ffmpeg for $video_device"
  pkill -9 -f "rename_captures.sh.*$output_dir" 2>/dev/null && echo "Killed existing rename_captures.sh for $output_dir"
  pkill -9 -f "clean_captures.sh.*$output_dir" 2>/dev/null && echo "Killed existing clean_captures.sh for $output_dir"
}

# Cleanup function
cleanup() {
  local ffmpeg_pid=$1 rename_pid=$2 clean_pid=$3 video_device=$4

  echo "Caught signal, cleaning up for $video_device..."
  [ -n "$ffmpeg_pid" ] && kill "$ffmpeg_pid" 2>/dev/null && echo "Killed ffmpeg (PID: $ffmpeg_pid)"
  [ -n "$rename_pid" ] && kill "$rename_pid" 2>/dev/null && echo "Killed rename_captures.sh (PID: $rename_pid)"
  [ -n "$clean_pid" ] && kill "$clean_pid" 2>/dev/null && echo "Killed clean_captures.sh (PID: $clean_pid)"
}

# Function to start processes for a single grabber
start_grabber() {
  local video_device=$1 audio_device=$2 capture_dir=$3 index=$4 fps=$5

  # Create capture directory
  mkdir -p "$capture_dir/captures"

  # Kill existing processes
  kill_existing_processes "$capture_dir" "$video_device"

  # FFMPEG command (simplified for better compatibility)
  FFMPEG_CMD="/usr/bin/ffmpeg -y -f v4l2 -framerate \"$fps\" -video_size 1024x768 -i $video_device \
    -f alsa -thread_queue_size 1024 -i \"$audio_device\" \
    -filter_complex \"[0:v]split=2[stream][capture];[stream]scale=640:360[streamout];[capture]fps=1[captureout]\" \
    -map \"[streamout]\" -map 1:a \
    -c:v libx264 -preset veryfast -tune zerolatency -crf 28 -maxrate 1200k -bufsize 2400k -g 30 \
    -pix_fmt yuv420p -profile:v baseline -level 3.0 \
    -c:a aac -b:a 64k -ar 44100 -ac 2 \
    -f hls -hls_time 2 -hls_list_size 5 -hls_flags delete_segments \
    -hls_segment_filename $capture_dir/segment_%03d.ts \
    $capture_dir/output.m3u8 \
    -map \"[captureout]\" -c:v mjpeg -q:v 5 -r 1 -f image2 \
    $capture_dir/captures/test_capture_%06d.jpg"



  # Start ffmpeg
  echo "Starting ffmpeg for $video_device $audio_device..."
  local FFMPEG_LOG="/tmp/ffmpeg_output_${index}.log"
  reset_log_if_large "$FFMPEG_LOG"
  eval $FFMPEG_CMD > "$FFMPEG_LOG" 2>&1 &
  local FFMPEG_PID=$!
  echo "Started ffmpeg for $video_device $audio_device with PID: $FFMPEG_PID"

  # Start rename script
  /usr/local/bin/rename_captures.sh "$capture_dir" &
  local RENAME_PID=$!
  echo "Started rename_captures.sh for $capture_dir with PID: $RENAME_PID"

  # Start clean script
  while true; do
    /usr/local/bin/clean_captures.sh "$capture_dir"
    sleep 300
  done &
  local CLEAN_PID=$!
  echo "Started clean_captures.sh loop for $capture_dir with PID: $CLEAN_PID"

  # Set up trap for this grabber
  trap "cleanup $FFMPEG_PID $RENAME_PID $CLEAN_PID $video_device $audio_device" SIGINT SIGTERM
}

# Print all FFMPEG commands first (before starting parallel processes)
for index in "${!GRABBERS[@]}"; do
  IFS='|' read -r video_device audio_device capture_dir fps <<< "${GRABBERS[$index]}"
  
  # Build the FFMPEG command for display
  FFMPEG_CMD="/usr/bin/ffmpeg -y -f v4l2 -framerate \"$fps\" -video_size 1920x1080 -i $video_device \
    -f alsa -thread_queue_size 1024 -i \"$audio_device\" \
    -filter_complex \"[0:v]split=2[stream][capture];[stream]scale=640:360[streamout];[capture]fps=1[captureout]\" \
    -map \"[streamout]\" -map 1:a \
    -c:v libx264 -preset veryfast -tune zerolatency -crf 28 -maxrate 1200k -bufsize 2400k -g 30 \
    -pix_fmt yuv420p -profile:v baseline -level 3.0 \
    -c:a aac -b:a 64k -ar 44100 -ac 2 \
    -f hls -hls_time 2 -hls_list_size 5 -hls_flags delete_segments \
    -hls_segment_filename $capture_dir/segment_%03d.ts \
    $capture_dir/output.m3u8 \
    -map \"[captureout]\" -c:v mjpeg -q:v 5 -r 1 -f image2 \
    $capture_dir/captures/test_capture_%06d.jpg"
  
  echo "FFMPEG Command for $video_device (audio: $audio_device):"
  echo "$FFMPEG_CMD"
  echo
done

# Main loop to start all grabbers
PIDS=()
for index in "${!GRABBERS[@]}"; do
  IFS='|' read -r video_device audio_device capture_dir fps <<< "${GRABBERS[$index]}"
  start_grabber "$video_device" "$audio_device" "$capture_dir" "$index" "$fps" &
  PIDS+=($!)
done

# Wait for all grabber processes
wait "${PIDS[@]}"

# Keep script alive for systemd compatibility
while true; do
  sleep 3600
done