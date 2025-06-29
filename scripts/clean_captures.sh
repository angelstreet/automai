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
    # Delete any .jpg files older than 10 minutes (600 seconds) in directory and subdirectories
    find "$CAPTURE_DIR" -type f -name "*.jpg" -mmin +10 -delete -printf "Deleted %p\n" >> /tmp/clean.log 2>&1
  fi
done