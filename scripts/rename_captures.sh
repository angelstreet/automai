#!/bin/bash
CAPTURE_DIR="/var/www/html/stream/captures"
inotifywait -m "$CAPTURE_DIR" -e create -e moved_to |
  while read -r dir events file; do
    if [[ "$file" =~ ^test_capture_[0-9]+\.jpg$ ]]; then
      filepath="$CAPTURE_DIR/$file"
      sleep 0.1  # Wait 100ms to ensure file is fully written
      if [ -f "$filepath" ]; then
        timestamp=$(stat -c %y "$filepath" | awk '{print $1$2}' | sed 's/[-:]//g;s/\..*//')
        ms=$(stat -c %y "$filepath" | awk '{print $2}' | sed 's/.*\.//;s/[^0-9]//g' | cut -c 1-3)
        newname="${CAPTURE_DIR}/capture_${timestamp}_${ms}.jpg"
        mv -f "$filepath" "$newname" 2>/dev/null && echo "Renamed $file to $(basename "$newname")"
      fi
    fi
  done