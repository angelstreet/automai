#!/bin/bash

# Set timezone to Zurich
export TZ="Europe/Zurich"

# Capture directory (passed as argument)
CAPTURE_DIR="$1"

# Check if directory exists
if [ ! -d "$CAPTURE_DIR" ]; then
  echo "Directory $CAPTURE_DIR does not exist, exiting..." >> /tmp/rename.log
  exit 1
fi

# Check if ImageMagick is installed
if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick is not installed. Please install it with 'brew install imagemagick'." >> /tmp/rename.log
  exit 1
fi

echo "Watching $CAPTURE_DIR for new files..." >> /tmp/rename.log

# Poll for new files (since inotifywait is not available on macOS)
while true; do
  for filepath in "$CAPTURE_DIR"/test_capture_*.jpg; do
    if [ -f "$filepath" ]; then
      start_time=$(date +%s.%N)
      # Use current system time for timestamp
      timestamp=$(TZ="Europe/Zurich" date +%Y%m%d%H%M%S)
      if [ -z "$timestamp" ]; then
        echo "Failed to generate timestamp for $filepath" >> /tmp/rename.log
        continue
      fi
      newname="${CAPTURE_DIR}/capture_${timestamp}.jpg"
      thumbnail="${CAPTURE_DIR}/capture_${timestamp}_thumbnail.jpg"
      if mv -f "$filepath" "$newname" 2>>/tmp/rename.log; then
        echo "Renamed $(basename "$filepath") to $(basename "$newname") at $(date)" >> /tmp/rename.log
        # Create thumbnail in background
        magick "$newname" -thumbnail 498x280 -strip -quality 85 "$thumbnail" 2>>/tmp/rename.log &
        echo "Started thumbnail creation for $(basename "$thumbnail")" >> /tmp/rename.log
      else
        echo "Failed to rename $filepath to $newname" >> /tmp/rename.log
      fi
      end_time=$(date +%s.%N)
      echo "Processed $filepath in $(echo "$end_time - $start_time" | bc) seconds" >> /tmp/rename.log
    fi
  done
  sleep 1  # Poll every second
done