#!/bin/bash

# Capture directory (passed as argument)
CAPTURE_DIR="$1"

# Check if directory exists
if [ ! -d "$CAPTURE_DIR" ]; then
  echo "Directory $CAPTURE_DIR does not exist, skipping..." >> /tmp/clean.log
  exit 0
fi

# Delete originals and thumbnails older than 10 minutes (600 seconds)
find "$CAPTURE_DIR" -type f \( -name "capture_*.jpg" -o -name "capture_*_thumbnail.jpg" \) -mmin +10 -delete -exec basename {} \; >> /tmp/clean.log 2>&1