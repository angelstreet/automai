#!/bin/bash

# Set timezone to Zurich
export TZ="Europe/Zurich"

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
      start_time=$(date +%s.%N)
      # Use current system time for timestamp
      timestamp=$(TZ="Europe/Zurich" date +%Y%m%d%H%M%S)
      if [ -z "$timestamp" ]; then
        echo "Failed to generate timestamp for $filepath" >> /tmp/rename.log
        return
      fi
      CAPTURE_DIR=$(dirname "$filepath")
      newname="${CAPTURE_DIR}/capture_${timestamp}.jpg"
      thumbnail="${CAPTURE_DIR}/capture_${timestamp}_thumbnail.jpg"
      if mv -f "$filepath" "$newname" 2>>/tmp/rename.log; then
        echo "Renamed $(basename "$filepath") to $(basename "$newname") at $(date)" >> /tmp/rename.log
        
        # Create thumbnail and run AI monitoring analysis in parallel
        convert "$newname" -thumbnail 498x280 -strip -quality 85 "$thumbnail" 2>>/tmp/rename.log &
        echo "Started thumbnail creation for $(basename "$thumbnail")" >> /tmp/rename.log
        
        # Run AI monitoring analysis in background
        /usr/local/bin/analyze_frame.py "$newname" 2>>/tmp/monitoring.log &
        echo "Started AI monitoring analysis for $(basename "$newname")" >> /tmp/rename.log
       
      else
        echo "Failed to rename $filepath to $newname" >> /tmp/rename.log
      fi
      end_time=$(date +%s.%N)
      echo "Processed $filepath in $(echo "$end_time - $start_time" | bc) seconds" >> /tmp/rename.log
    else
      echo "File $filepath does not exist or is not accessible" >> /tmp/rename.log
    fi
  fi
}

# Check if ImageMagick is installed
if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick is not installed. Please install it to create thumbnails." >> /tmp/rename.log
  exit 1
fi

# Check if Python3 is available for AI monitoring
if command -v python3 >/dev/null 2>&1; then
  echo "Python3 found, AI monitoring analysis will be enabled." >> /tmp/rename.log
else
  echo "Python3 not found, AI monitoring analysis will be skipped." >> /tmp/rename.log
fi

# Filter existing directories
EXISTING_DIRS=()
for CAPTURE_DIR in "${CAPTURE_DIRS[@]}"; do
  if [ -d "$CAPTURE_DIR" ]; then
    EXISTING_DIRS+=("$CAPTURE_DIR")
    echo "Will watch $CAPTURE_DIR for new files..." >> /tmp/rename.log
  else
    echo "Directory $CAPTURE_DIR does not exist, skipping..." >> /tmp/rename.log
  fi
done

# Exit if no directories exist
if [ ${#EXISTING_DIRS[@]} -eq 0 ]; then
  echo "No valid directories to watch, exiting." >> /tmp/rename.log
  exit 1
fi

# Watch all existing directories with a single inotifywait
inotifywait -m "${EXISTING_DIRS[@]}" -e create -e moved_to --format '%w%f' |
  while read -r filepath; do
    process_file "$filepath"
  done