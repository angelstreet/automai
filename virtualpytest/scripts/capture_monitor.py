#!/usr/bin/env python3
"""
Standalone Capture Monitor Service
Monitors capture directories for new files and processes them independently
Completely separate from video capture workflow to avoid interference
"""

import os
import sys
import time
import signal
import subprocess
import threading
import glob
from datetime import datetime
from pathlib import Path

# Configuration
CAPTURE_DIRS = [
    "/var/www/html/stream/capture1/captures",
    "/var/www/html/stream/capture2/captures", 
    "/var/www/html/stream/capture3/captures",
    "/var/www/html/stream/capture4/captures"
]

HOST_NAME = os.environ.get('HOST_NAME', os.uname().nodename)
SCRIPTS_DIR = "/home/sunri-pi1/automai/virtualpytest/scripts"
VENV_PATH = "/home/sunri-pi1/myvenv/bin/activate"

AUDIO_ANALYSIS_INTERVAL = 5   # seconds - REDUCED from 10s
FRAME_ANALYSIS_INTERVAL = 3   # seconds - REDUCED from 10s for more frequent video monitoring

class CaptureMonitor:
    def __init__(self):
        self.running = True
        self.setup_signal_handlers()
        
    def setup_signal_handlers(self):
        """Setup graceful shutdown"""
        signal.signal(signal.SIGTERM, self.shutdown)
        signal.signal(signal.SIGINT, self.shutdown)
        
    def shutdown(self, signum, frame):
        """Graceful shutdown handler"""
        print(f"[@capture_monitor] Received signal {signum}, shutting down...")
        self.running = False
        
    def get_existing_directories(self):
        """Get list of existing capture directories"""
        existing = []
        for capture_dir in CAPTURE_DIRS:
            if os.path.exists(capture_dir):
                existing.append(capture_dir)
                print(f"[@capture_monitor] Monitoring: {capture_dir}")
            else:
                print(f"[@capture_monitor] Skipping non-existent: {capture_dir}")
        return existing

    def find_latest_frame(self, capture_dir):
        """Find the most recent frame file (like audio's find_latest_segment)"""
        try:
            pattern = os.path.join(capture_dir, "capture_*.jpg")
            frames = glob.glob(pattern)
            if not frames:
                return None
            
            # Filter out thumbnail files - only process original images
            original_frames = [f for f in frames if '_thumbnail' not in f]
            if not original_frames:
                return None
            
            # Sort by modification time, get newest (like audio does)
            latest = max(original_frames, key=os.path.getmtime)
            return latest
        except Exception as e:
            print(f"[@capture_monitor] Error finding latest frame in {capture_dir}: {e}")
            return None

    def process_latest_frame(self, capture_dir):
        """Process the latest frame in a capture directory (like audio processing)"""
        try:
            # Find latest frame (like audio finds latest segment)
            latest_frame = self.find_latest_frame(capture_dir)
            
            if not latest_frame:
                print(f"[@capture_monitor] No frames found in {capture_dir}")
                return
                
            # Check if this frame already has a JSON file
            json_path = latest_frame.replace('.jpg', '.json')
            if os.path.exists(json_path):
                print(f"[@capture_monitor] Frame already analyzed: {os.path.basename(latest_frame)}")
                return
                
            print(f"[@capture_monitor] Processing latest frame: {os.path.basename(latest_frame)}")
            
            # Wait a bit to ensure file is fully written
            time.sleep(2)
            
            # Check if file still exists and is readable
            if not os.path.exists(latest_frame):
                print(f"[@capture_monitor] Frame disappeared: {latest_frame}")
                return
                
            # Run frame analysis
            cmd = [
                "bash", "-c",
                f"source {VENV_PATH} && python {SCRIPTS_DIR}/analyze_frame.py '{latest_frame}' '{HOST_NAME}'"
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=os.path.dirname(latest_frame)
            )
            
            if result.returncode == 0:
                print(f"[@capture_monitor] Frame analysis completed: {os.path.basename(latest_frame)}")
            else:
                print(f"[@capture_monitor] Frame analysis failed: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            print(f"[@capture_monitor] Frame analysis timeout: {latest_frame}")
        except Exception as e:
            print(f"[@capture_monitor] Frame analysis error: {e}")
            
    def process_audio(self, capture_dir):
        """Process audio for a capture directory"""
        try:
            # Get parent directory (remove /captures suffix)
            main_capture_dir = os.path.dirname(capture_dir)
            
            if not os.path.exists(main_capture_dir):
                return
                
            print(f"[@capture_monitor] Processing audio: {main_capture_dir}")
            
            # Run audio analysis
            cmd = [
                "bash", "-c", 
                f"source {VENV_PATH} && python {SCRIPTS_DIR}/analyze_audio.py '{main_capture_dir}' '{HOST_NAME}'"
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                print(f"[@capture_monitor] Audio analysis completed: {os.path.basename(main_capture_dir)}")
            else:
                print(f"[@capture_monitor] Audio analysis failed: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            print(f"[@capture_monitor] Audio analysis timeout: {capture_dir}")
        except Exception as e:
            print(f"[@capture_monitor] Audio analysis error: {e}")

    def frame_worker(self, capture_dir):
        """Background frame analysis worker - ALIGNED WITH AUDIO WORKER"""
        print(f"[@capture_monitor] Started frame worker for: {capture_dir}")
        
        while self.running:
            try:
                self.process_latest_frame(capture_dir)
                
                # Sleep in small intervals to allow quick shutdown (same as audio)
                for _ in range(FRAME_ANALYSIS_INTERVAL):
                    if not self.running:
                        break
                    time.sleep(1)
                    
            except Exception as e:
                print(f"[@capture_monitor] Frame worker error: {e}")
                time.sleep(5)
                
        print(f"[@capture_monitor] Frame worker stopped for: {capture_dir}")
            
    def audio_worker(self, capture_dir):
        """Background audio analysis worker for a specific capture directory"""
        print(f"[@capture_monitor] Started audio worker for: {capture_dir}")
        
        while self.running:
            try:
                self.process_audio(capture_dir)
                
                # Sleep in small intervals to allow quick shutdown
                for _ in range(AUDIO_ANALYSIS_INTERVAL):
                    if not self.running:
                        break
                    time.sleep(1)
                    
            except Exception as e:
                print(f"[@capture_monitor] Audio worker error: {e}")
                time.sleep(5)
                
        print(f"[@capture_monitor] Audio worker stopped for: {capture_dir}")

    def start_frame_workers(self, capture_dirs):
        """Start frame analysis workers for all capture directories - ALIGNED WITH AUDIO"""
        for capture_dir in capture_dirs:
            thread = threading.Thread(
                target=self.frame_worker,
                args=(capture_dir,),
                daemon=True
            )
            thread.start()
            print(f"[@capture_monitor] Started frame thread for: {capture_dir}")
        
    def start_audio_workers(self, capture_dirs):
        """Start audio analysis workers for all capture directories"""
        for capture_dir in capture_dirs:
            thread = threading.Thread(
                target=self.audio_worker,
                args=(capture_dir,),
                daemon=True
            )
            thread.start()
            print(f"[@capture_monitor] Started audio thread for: {capture_dir}")
            
    def run(self):
        """Main monitoring loop - SIMPLIFIED"""
        print(f"[@capture_monitor] Starting Capture Monitor Service v2.1 - OPTIMIZED INTERVALS")
        print(f"[@capture_monitor] Host: {HOST_NAME}")
        print(f"[@capture_monitor] Scripts: {SCRIPTS_DIR}")
        print(f"[@capture_monitor] Frame analysis interval: {FRAME_ANALYSIS_INTERVAL}s (optimized for video)")
        print(f"[@capture_monitor] Audio analysis interval: {AUDIO_ANALYSIS_INTERVAL}s (optimized for audio)")
        print(f"[@capture_monitor] PID: {os.getpid()}")
        
        # Get existing directories
        capture_dirs = self.get_existing_directories()
        if not capture_dirs:
            print(f"[@capture_monitor] No capture directories found, exiting")
            return
            
        # Start audio analysis workers (unchanged)
        self.start_audio_workers(capture_dirs)
        
        # Start frame analysis workers (NEW - aligned with audio)
        self.start_frame_workers(capture_dirs)
        
        # Start alert processor service
        self.start_alert_processor()
        
        print(f"[@capture_monitor] All workers started - timer-based processing (no file scanning)")
        
        # Simple main loop - just keep alive
        while self.running:
            try:
                time.sleep(10)  # Just keep alive, workers do the real work
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"[@capture_monitor] Unexpected error: {e}")
                time.sleep(5)
                
        print(f"[@capture_monitor] Monitoring stopped")
        
    def start_alert_processor(self):
        """Start alert processor if not already running"""
        try:
            # Check if already running
            result = subprocess.run(
                ["pgrep", "-f", "alert_processor.py"],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"[@capture_monitor] Alert processor already running")
                return
                
            # Start alert processor
            cmd = [
                "bash", "-c",
                f"source {VENV_PATH} && python {SCRIPTS_DIR}/alert_processor.py"
            ]
            
            subprocess.Popen(
                cmd,
                stdout=open("/tmp/alert_processor.log", "a"),
                stderr=subprocess.STDOUT,
                cwd=SCRIPTS_DIR
            )
            
            print(f"[@capture_monitor] Started alert processor service")
            
        except Exception as e:
            print(f"[@capture_monitor] Error starting alert processor: {e}")

def main():
    """Main entry point"""
    print(f"[@capture_monitor] Capture Monitor Service v2.0 - Aligned Architecture")
    
    monitor = CaptureMonitor()
    
    try:
        monitor.run()
    except Exception as e:
        print(f"[@capture_monitor] Fatal error: {e}")
        sys.exit(1)
        
if __name__ == '__main__':
    main() 