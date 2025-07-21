#!/bin/bash

# Set timezone to Zurich
export TZ="Europe/Zurich"

# Note: Alert monitoring has been moved to standalone capture_monitor.py service
# This script now focuses only on video capture and thumbnail creation

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
        
        # Thumbnail created - monitoring will be handled by separate capture_monitor.py service
        echo "Created thumbnail $(basename "$thumbnail") - monitoring handled separately" >> "$RENAME_LOG"
       
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

# Note: Audio analysis has been moved to standalone capture_monitor.py service
# No background processes started by this script anymore

# Watch all existing directories with a single inotifywait
inotifywait -m "${EXISTING_DIRS[@]}" -e create -e moved_to --format '%w%f' |
  while read -r filepath; do
    process_file "$filepath"
  done