#!/bin/bash

# Configuration array for grabbers: video_device|audio_device|capture_dir|fps
declare -A GRABBERS=(
  ["0"]="/dev/video0|plughw:2,0|/var/www/html/stream/capture1|5"
  ["1"]="/dev/video2|plughw:3,0|/var/www/html/stream/capture2|5"
)

# Reset log if large
reset_log_if_large() {
  local logfile="$1"
  local max_size_mb=30
  [ -f "$logfile" ] && [ "$(du -m "$logfile" | cut -f1)" -ge "$max_size_mb" ] && {
    echo "$(date): Log $logfile exceeded ${max_size_mb}MB, resetting..." >> "$logfile"
    > "$logfile"
    echo "$(date): Log reset" >> "$logfile"
  }
}

# Kill existing processes
kill_existing_processes() {
  local output_dir=$1 video_device=$2
  echo "Checking for existing processes for $video_device..."
  pkill -9 -f "ffmpeg.*$video_device" && echo "Killed ffmpeg for $video_device"
  pkill -9 -f "rename_captures.sh.*$output_dir" && echo "Killed rename_captures.sh for $output_dir"
  pkill -9 -f "clean_captures.sh.*$output_dir" && echo "Killed clean_captures.sh for $output_dir"
}

# Cleanup function
cleanup() {
  local ffmpeg_pid=$1 rename_pid=$2 clean_pid=$3 video_device=$4
  echo "Cleaning up for $video_device..."
  [ -n "$ffmpeg_pid" ] && kill "$ffmpeg_pid" 2>/dev/null && echo "Killed ffmpeg (PID: $ffmpeg_pid)"
  [ -n "$rename_pid" ] && kill "$rename_pid" 2>/dev/null && echo "Killed rename_captures.sh (PID: $rename_pid)"
  [ -n "$clean_pid" ] && kill "$clean_pid" 2>/dev/null && echo "Killed clean_captures.sh (PID: $clean_pid)"
  exit 0
}

# Start grabber function
start_grabber() {
  local video_device=$1 audio_device=$2 capture_dir=$3 index=$4 fps=$5

  local ffmpeg_cmd="/usr/bin/ffmpeg -y -loglevel verbose \
    -f v4l2 -framerate \"$fps\" -video_size 1920x1080 -pixel_format yuv420p -thread_queue_size 512 -i \"$video_device\" \
    -fflags nobuffer+flush_packets -avioflags direct -probesize 32 -analyzeduration 0 \
    -filter_complex \"[0:v]split=2[stream][capture];[stream]scale=640:360:force_original_aspect_ratio=decrease:sws_flags=fast_bilinear,format=yuv420p[streamout];[capture]fps=2[captureout]\" \
    -map \"[streamout]\" \
    -c:v libx264 -preset ultrafast -tune zerolatency -b:v 500k -maxrate 600k -bufsize 100k \
    -g 5 -keyint_min 5 -sc_threshold 0 -flags low_delay+global_header -threads 2 -an -x264opts rc-lookahead=0:sync-lookahead=0:ref=1:bframes=0\
    -f hls -hls_time 0.5 -hls_list_size 2 \
    -hls_flags delete_segments+discont_start+split_by_time \
    -hls_segment_type mpegts -hls_init_time 0.5 -hls_allow_cache 0 \
    -hls_segment_filename \"$capture_dir/segment_%03d.ts\" \"$capture_dir/output.m3u8\" \
    -map \"[captureout]\" -c:v mjpeg -q:v 4 -f image2 \"$capture_dir/captures/test_capture_%06d.jpg\""

  echo "FFmpeg command for index $index: $ffmpeg_cmd"
  mkdir -p "$capture_dir/captures"
  kill_existing_processes "$capture_dir" "$video_device"

  eval "$ffmpeg_cmd" > "/tmp/ffmpeg_output_${index}.log" 2>&1 &
  local FFMPEG_PID=$!
  sleep 2
  if ! ps -p $FFMPEG_PID > /dev/null; then
    echo "Error: FFmpeg failed for $video_device. Check /tmp/ffmpeg_output_${index}.log"
    cleanup "$FFMPEG_PID" "" "" "$video_device"
    exit 1
  fi
  echo "Started ffmpeg for $video_device with PID: $FFMPEG_PID"

  /usr/local/bin/rename_captures.sh "$capture_dir" &
  local RENAME_PID=$!
  echo "Started rename_captures.sh for $capture_dir with PID: $RENAME_PID"

  (
    while true; do
      /usr/local/bin/clean_captures.sh "$capture_dir"
      sleep 300
    done
  ) &
  local CLEAN_PID=$!
  echo "Started clean_captures.sh loop for $capture_dir with PID: $CLEAN_PID"

  # Trap signals for this grabber's processes
  trap "echo 'Signal received, cleaning up grabber $index'; cleanup $FFMPEG_PID $RENAME_PID $CLEAN_PID $video_device" SIGINT SIGTERM
}

# Main loop
PIDS=()
for index in "${!GRABBERS[@]}"; do
  IFS='|' read -r video_device audio_device capture_dir fps <<< "${GRABBERS[$index]}"
  start_grabber "$video_device" "$audio_device" "$capture_dir" "$index" "$fps" &
  PIDS+=($!)
done

wait "${PIDS[@]}"