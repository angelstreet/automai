#!/bin/bash
CAPTURE_DIR="/var/www/html/stream/captures"
FFMPEG_CMD="/usr/bin/ffmpeg -f v4l2 -input_format mjpeg -framerate 5 -video_size 1920x1080 -i /dev/video0 \
  -vf \"fps=5,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:\
  text='%{pts\\:hms}':fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5:x=10:y=10\" \
  -c:v mjpeg -q:v 3 -r 5 -f image2 \
  $CAPTURE_DIR/test_capture_%06d.jpg"
RENAME_SCRIPT="/var/www/html/stream/captures/rename_captures.sh"

# Ensure capture directory exists and has correct permissions
mkdir -p "$CAPTURE_DIR"
chown www-data:www-data "$CAPTURE_DIR"
chmod 775 "$CAPTURE_DIR"

# Start FFmpeg in the background
$FFMPEG_CMD &

# Start renaming script in the background
$RENAME_SCRIPT &

# Wait for both processes to keep the service running
wait