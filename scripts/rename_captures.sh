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

# Function to process a single directory
process_directory() {
  local CAPTURE_DIR="$1"
  if [ ! -d "$CAPTURE_DIR" ]; then
    return
  fi
  echo "Watching $CAPTURE_DIR for new files..." >> /tmp/rename.log
  inotifywait -m "$CAPTURE_DIR" -e create -e moved_to --format '%w%f' |
    while read -r filepath; do
      if [[ "$filepath" =~ test_capture_[0-9]+\.jpg$ ]]; then
        sleep 0.2
        if [ -f "$filepath" ]; then
          timestamp=$(TZ="Europe/Zurich" stat -c %y "$filepath" 2>>/tmp/rename.log | awk '{print $1 $2}' | tr -d ':-' | cut -d'.' -f1)
          if [ -z "$timestamp" ]; then
            echo "Failed to get timestamp for $filepath" >> /tmp/rename.log
            continue
          fi
          newname="${CAPTURE_DIR}/capture_${timestamp}.jpg"
          thumbnail="${CAPTURE_DIR}/capture_${timestamp}_thumbnail.jpg"
          if mv -f "$filepath" "$newname" 2>>/tmp/rename.log; then
            echo "Renamed $(basename "$filepath") to $(basename "$newname")" >> /tmp/rename.log
            # Create thumbnail (resize to 320x240, maintain aspect ratio)
            if convert "$newname" -resize 498x280 "$thumbnail" 2>>/tmp/rename.log; then
              echo "Created thumbnail $(basename "$thumbnail")" >> /tmp/rename.log
            else
              echo "Failed to create thumbnail for $newname" >> /tmp/rename.log
            fi
          else
            echo "Failed to rename $filepath to $newname" >> /tmp/rename.log
          fi
        else
          echo "File $filepath does not exist or is not accessible" >> /tmp/rename.log
        fi
      fi
    done
}

# Check if ImageMagick is installed
if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick is not installed. Please install it to create thumbnails." >> /tmp/rename.log
  exit 1
fi

# Start a process for each existing directory
for CAPTURE_DIR in "${CAPTURE_DIRS[@]}"; do
  if [ -d "$CAPTURE_DIR" ]; then
    process_directory "$CAPTURE_DIR" &
  fi
done

# Wait for all background processes
wait