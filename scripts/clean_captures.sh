#!/bin/bash

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

# Log file
CLEAN_LOG="/tmp/clean.log"

# Check log on startup
reset_log_if_large "$CLEAN_LOG"

# Array of possible capture directories
CAPTURE_DIRS=(
  "/var/www/html/stream/capture1/captures"
  "/var/www/html/stream/capture2/captures"
  "/var/www/html/stream/capture3/captures"
  "/var/www/html/stream/capture4/captures"
)

# Process each existing directory
for CAPTURE_DIR in "${CAPTURE_DIRS[@]}"; do
  if [ -d "$CAPTURE_DIR" ]; then
    # Delete any files older than 10 minutes (600 seconds) - includes .jpg, .json, thumbnails, etc.
    find "$CAPTURE_DIR" -type f -mmin +10 -delete -printf "Deleted %p\n" >> "$CLEAN_LOG" 2>&1
    reset_log_if_large "$CLEAN_LOG"
  fi
done