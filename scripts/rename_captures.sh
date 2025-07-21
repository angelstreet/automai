#!/bin/bash

# Set timezone to Zurich
export TZ="Europe/Zurich"

# Host configuration for alerting system
HOST_NAME="${HOST_NAME:-$(hostname)}"

# Start alert processor in background if not already running
start_alert_processor() {
  if ! pgrep -f "alert_processor.py" >/dev/null 2>&1; then
    echo "Starting alert processor service..." >> "$RENAME_LOG"
    (
      source /home/sunri-pi1/myvenv/bin/activate && \
      python /home/sunri-pi1/automai/virtualpytest/scripts/alert_processor.py
    ) >> "/tmp/alert_processor.log" 2>&1 &
    
    ALERT_PROCESSOR_PID=$!
    echo "Alert processor started with PID: $ALERT_PROCESSOR_PID" >> "$RENAME_LOG"
  else
    echo "Alert processor already running" >> "$RENAME_LOG"
  fi
}

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

# Log files
RENAME_LOG="/tmp/rename.log"
MONITORING_LOG="/tmp/monitoring.log"
AUDIO_LOG="/tmp/audio.log"

# Check logs on startup
reset_log_if_large "$RENAME_LOG"
reset_log_if_large "$MONITORING_LOG"
reset_log_if_large "$AUDIO_LOG"

# Array of possible capture directories
CAPTURE_DIRS=(
  "/var/www/html/stream/capture1/captures"
  "/var/www/html/stream/capture2/captures"
  "/var/www/html/stream/capture3/captures"
  "/var/www/html/stream/capture4/captures"
)

# Function to process a file
process_file() {
  local filepath="$1"
  if [[ "$filepath" =~ test_capture_[0-9]+\.jpg$ ]]; then
    if [ -f "$filepath" ]; then
      sleep 0.1
      start_time=$(date +%s.%N)
      # Use current system time for timestamp
      timestamp=$(TZ="Europe/Zurich" date +%Y%m%d%H%M%S)
      if [ -z "$timestamp" ]; then
        echo "Failed to generate timestamp for $filepath" >> "$RENAME_LOG"
        return
      fi
      CAPTURE_DIR=$(dirname "$filepath")
      newname="${CAPTURE_DIR}/capture_${timestamp}.jpg"
      thumbnail="${CAPTURE_DIR}/capture_${timestamp}_thumbnail.jpg"
      if mv -f "$filepath" "$newname" 2>>"$RENAME_LOG"; then
        echo "Renamed $(basename "$filepath") to $(basename "$newname") at $(date)" >> "$RENAME_LOG"
        
        # Create thumbnail synchronously first
        convert "$newname" -thumbnail 498x280 -strip -quality 85 "$thumbnail" 2>>"$RENAME_LOG"
        echo "Created thumbnail $(basename "$thumbnail")" >> "$RENAME_LOG"
        
        # Run AI monitoring analysis on thumbnail (now that it's guaranteed to exist)
        (
          source /home/sunri-pi1/myvenv/bin/activate && \
          python /home/sunri-pi1/automai/virtualpytest/scripts/analyze_frame.py "$thumbnail" "$HOST_NAME"
        ) 2>>"$MONITORING_LOG"
        echo "Started AI monitoring analysis for $(basename "$thumbnail") with host: $HOST_NAME" >> "$RENAME_LOG"
       
      else
        echo "Failed to rename $filepath to $newname" >> "$RENAME_LOG"
      fi
      end_time=$(date +%s.%N)
      echo "Processed $filepath in $(echo "$end_time - $start_time" | bc) seconds" >> "$RENAME_LOG"
      
      # Check log sizes after processing
      reset_log_if_large "$RENAME_LOG"
      reset_log_if_large "$MONITORING_LOG"
    else
      echo "File $filepath does not exist or is not accessible" >> "$RENAME_LOG"
    fi
  fi
}

# Check if ImageMagick is installed
if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick is not installed. Please install it to create thumbnails." >> "$RENAME_LOG"
  exit 1
fi

# Filter existing directories
EXISTING_DIRS=()
for CAPTURE_DIR in "${CAPTURE_DIRS[@]}"; do
  if [ -d "$CAPTURE_DIR" ]; then
    EXISTING_DIRS+=("$CAPTURE_DIR")
    echo "Will watch $CAPTURE_DIR for new files..." >> "$RENAME_LOG"
  else
    echo "Directory $CAPTURE_DIR does not exist, skipping..." >> "$RENAME_LOG"
  fi
done

# Exit if no directories exist
if [ ${#EXISTING_DIRS[@]} -eq 0 ]; then
  echo "No valid directories to watch, exiting." >> "$RENAME_LOG"
  exit 1
fi

# Function to run audio analysis every 10 seconds (reduced frequency for performance)
run_audio_analysis() {
  while true; do
    sleep 10
    for CAPTURE_DIR in "${EXISTING_DIRS[@]}"; do
      # Get parent directory (remove /captures suffix for main capture dir)
      MAIN_CAPTURE_DIR=$(dirname "$CAPTURE_DIR")
      if [ -d "$MAIN_CAPTURE_DIR" ]; then
        (
          source /home/sunri-pi1/myvenv/bin/activate && \
          python /home/sunri-pi1/automai/virtualpytest/scripts/analyze_audio.py "$MAIN_CAPTURE_DIR" "$HOST_NAME"
        ) >> "$AUDIO_LOG" 2>&1
      fi
    done
    reset_log_if_large "$AUDIO_LOG"
  done
}

# Start alert processor service
start_alert_processor

# Start audio analysis in background
run_audio_analysis &
AUDIO_PID=$!
echo "Started audio analysis with PID: $AUDIO_PID" >> "$RENAME_LOG"

# Cleanup function for background processes
cleanup_processes() {
  if [ -n "$AUDIO_PID" ]; then
    kill "$AUDIO_PID" 2>/dev/null
    echo "Killed audio analysis (PID: $AUDIO_PID)" >> "$RENAME_LOG"
  fi
  
  # Kill alert processor if we started it
  ALERT_PID=$(pgrep -f "alert_processor.py" 2>/dev/null)
  if [ -n "$ALERT_PID" ]; then
    kill "$ALERT_PID" 2>/dev/null
    echo "Killed alert processor (PID: $ALERT_PID)" >> "$RENAME_LOG"
  fi
}
trap cleanup_processes EXIT SIGINT SIGTERM

# Watch all existing directories with a single inotifywait
inotifywait -m "${EXISTING_DIRS[@]}" -e create -e moved_to --format '%w%f' |
  while read -r filepath; do
    process_file "$filepath"
  done