# HDMI Stream Controller

This document describes the HDMI Stream Controller implementation that allows you to connect to and display video streams from URLs.

## Overview

The HDMI Stream Controller is designed to handle streaming video URLs (HLS, RTSP, HTTP, etc.) and simulate video display functionality. While this is a mock implementation for demonstration purposes, it provides a complete interface that can be extended with real video processing libraries.

## Features

- **Stream URL Support**: Connect to various streaming protocols (HLS, RTSP, HTTP/HTTPS)
- **Video Capture**: Start/stop video capture with configurable resolution and FPS
- **Audio Capture**: Audio level detection and silence detection
- **Content Analysis**: Motion detection, color analysis, brightness analysis, and text detection
- **Stream Statistics**: Real-time statistics including frames received, data transferred, and uptime
- **Recording**: Session recording functionality
- **Error Handling**: Robust error handling and connection management

## Python Controller Usage

### Basic Usage

```python
from src.controllers.audiovideo.hdmi_stream import HDMIStreamController

# Create controller instance
controller = HDMIStreamController(device_name="My HDMI Stream")

# Set stream URL
stream_url = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8"
controller.set_stream_url(stream_url)

# Connect to stream
if controller.connect():
    print("Connected successfully!")
    
    # Start video capture
    if controller.start_video_capture("1920x1080", 30):
        print("Streaming started!")
        
        # Get stream statistics
        stats = controller.get_stream_stats()
        print(f"Frames received: {stats['frames_received']}")
        print(f"Uptime: {stats['uptime_seconds']} seconds")
        
        # Capture a frame
        controller.capture_frame("screenshot.png")
        
        # Analyze content
        motion_analysis = controller.analyze_video_content("motion")
        print(f"Motion detected: {motion_analysis['motion_detected']}")
        
        # Stop streaming
        controller.stop_video_capture()
    
    # Disconnect
    controller.disconnect()
```

### Advanced Features

```python
# Audio analysis
audio_level = controller.detect_audio_level()
is_silent = controller.detect_silence(threshold=5.0, duration=2.0)

# Content analysis
color_analysis = controller.analyze_video_content("color")
brightness_analysis = controller.analyze_video_content("brightness")
text_analysis = controller.analyze_video_content("text")

# Recording
controller.record_session(duration=30.0, filename="recording.mp4")

# Wait for video changes
change_detected = controller.wait_for_video_change(timeout=10.0, threshold=15.0)
```

## Web Interface Usage

### Opening the HDMI Stream Modal

1. Navigate to the Controller Management page
2. Expand the "AV Controllers" section
3. Click on "HDMI Stream" (it should show as "available")
4. The HDMI Stream Modal will open

### Using the Modal

1. **Stream Configuration**:
   - Enter a stream URL (HLS, RTSP, or HTTP)
   - Set resolution (default: 1920x1080)
   - Set FPS (default: 30)

2. **Connect & Stream**:
   - Click "Connect & Stream" to connect and automatically start streaming
   - The video will appear in the right panel
   - Stream statistics will be displayed in the left panel

3. **Controls**:
   - Start/Stop streaming
   - View real-time statistics (uptime, frames, data transferred)
   - Disconnect from stream

### Example Stream URLs

The modal includes several example URLs you can test with:

- **Tears of Steel**: `https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8`
- **Sintel**: `https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8`
- **Test Stream**: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`

## API Endpoints

The following REST API endpoints are available:

### Get Configuration
```
GET /api/virtualpytest/hdmi-stream/config
```
Returns supported protocols, resolutions, FPS options, and example URLs.

### Connect to Stream
```
POST /api/virtualpytest/hdmi-stream/connect
Content-Type: application/json

{
  "stream_url": "https://example.com/stream.m3u8",
  "resolution": "1920x1080",
  "fps": 30
}
```

### Disconnect from Stream
```
POST /api/virtualpytest/hdmi-stream/disconnect
```

### Get Status
```
GET /api/virtualpytest/hdmi-stream/status
```

### Control Stream
```
POST /api/virtualpytest/hdmi-stream/control
Content-Type: application/json

{
  "action": "start_capture|stop_capture|capture_frame|analyze_content|detect_audio_level|record_session",
  "resolution": "1920x1080",
  "fps": 30,
  "filename": "optional_filename",
  "analysis_type": "motion|color|brightness|text",
  "duration": 10.0
}
```

## Testing

Run the test script to verify the controller functionality:

```bash
cd virtualpytest
python test_hdmi_stream.py
```

This will test:
- Controller creation and initialization
- Stream URL validation and connection
- Video capture start/stop
- Frame capture
- Content analysis
- Audio level detection
- Error handling scenarios

## Real Implementation Notes

This is currently a mock implementation that simulates video streaming. For a real implementation, you would need to:

1. **Video Processing Library**: Integrate with libraries like:
   - OpenCV for video capture and processing
   - VLC Python bindings for stream playback
   - FFmpeg Python bindings for advanced video processing
   - GStreamer for professional streaming pipelines

2. **Display Integration**: Add actual video display using:
   - Tkinter for simple GUI display
   - PyQt/PySide for advanced GUI applications
   - Pygame for game-like applications
   - Web-based display using Flask/FastAPI with video streaming

3. **Stream Protocol Support**: Implement real protocol handlers for:
   - HLS (HTTP Live Streaming)
   - RTSP (Real Time Streaming Protocol)
   - WebRTC for real-time communication
   - Custom streaming protocols

4. **Hardware Integration**: Connect to actual HDMI capture devices:
   - USB capture cards
   - PCIe capture cards
   - Network-based capture devices

## Architecture Integration

The HDMI Stream Controller follows the same patterns as other controllers in the VirtualPyTest system:

- **Base Interface**: Implements `AVControllerInterface`
- **Factory Pattern**: Created via `ControllerFactory.create_av_controller()`
- **Consistent API**: Same method signatures as other AV controllers
- **Error Handling**: Standardized error responses and logging
- **Status Reporting**: Comprehensive status information

This ensures it integrates seamlessly with the existing controller ecosystem and can be used in automated test scenarios alongside other controllers.

## Browser Compatibility

The web interface video player supports:
- **HLS Streams**: Native support in Safari, HLS.js for other browsers
- **MP4/WebM**: Native HTML5 video support
- **RTSP**: Requires browser plugins or transcoding
- **Custom Protocols**: May require additional JavaScript libraries

For best compatibility, use HLS (.m3u8) streams which are widely supported across all modern browsers. 