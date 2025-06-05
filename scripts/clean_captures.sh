#!/bin/bash
CAPTURE_DIR="/var/www/html/stream/captures"
# Delete files older than 1 hour (3600 seconds)
find "$CAPTURE_DIR" -type f -name "test_capture_*.jpg" -mmin +60 -delete -printf "Deleted %f\n" >> /tmp/clean.log