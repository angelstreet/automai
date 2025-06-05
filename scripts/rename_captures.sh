#!/bin/bash
# Set timezone to Zurich
export TZ="Europe/Zurich"

CAPTURE_DIR="/var/www/html/stream/captures"
inotifywait -m "$CAPTURE_DIR" -e create -e moved_to |
  while read -r dir events file; do
    if [[ "$file" =~ ^test_capture_[0-9]+\.jpg$ ]]; then
      filepath="$CAPTURE_DIR/$file"
      sleep 0.1  # Wait 100ms to ensure file is fully written
      if [ -f "$filepath" ]; then
        # Use Zurich timezone for timestamp generation in format: YYYYMMDDHHMMSS
        timestamp=$(TZ="Europe/Zurich" stat -c %y "$filepath" | awk '{print $1$2}' | sed 's/[-:]//g;s/\..*//')
        ms=$(TZ="Europe/Zurich" stat -c %y "$filepath" | awk '{print $2}' | sed 's/.*\.//;s/[^0-9]//g' | cut -c 1-3)
        newname="${CAPTURE_DIR}/capture_${timestamp}.jpg"
        mv -f "$filepath" "$newname" 2>/dev/null && echo "Renamed $file to $(basename "$newname") using Zurich timezone format YYYYMMDDHHMMSS"
      fi
    fi
  done