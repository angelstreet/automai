#!/bin/bash

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
    # Delete originals and thumbnails older than 10 minutes (600 seconds)
    find "$CAPTURE_DIR" -type f \( -name "capture_*.jpg" -o -name "capture_*_thumbnail.jpg" \) -mmin +10 -delete -printf "Deleted %f\n" >> /tmp/clean.log 2>&1
  fi
done