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
from datetime import datetime
from pathlib import Path
import glob

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

AUDIO_ANALYSIS_INTERVAL = 10  # seconds
FRAME_PROCESSING_DELAY = 2    # seconds after file creation

class CaptureMonitor:
    def __init__(self):
        self.running = True
        self.processed_files = set()
        self.audio_threads = {}
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
        
    def process_frame(self, image_path):
        """Process a single frame file"""
        try:
            print(f"[@capture_monitor] Processing frame: {os.path.basename(image_path)}")
            
            # Wait a bit to ensure file is fully written
            time.sleep(FRAME_PROCESSING_DELAY)
            
            # Check if file still exists and is readable
            if not os.path.exists(image_path):
                print(f"[@capture_monitor] File disappeared: {image_path}")
                return
                
            # Run frame analysis
            cmd = [
                "bash", "-c",
                f"source {VENV_PATH} && python {SCRIPTS_DIR}/analyze_frame.py '{image_path}' '{HOST_NAME}'"
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=os.path.dirname(image_path)
            )
            
            if result.returncode == 0:
                print(f"[@capture_monitor] Frame analysis completed: {os.path.basename(image_path)}")
            else:
                print(f"[@capture_monitor] Frame analysis failed: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            print(f"[@capture_monitor] Frame analysis timeout: {image_path}")
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
        
    def start_audio_workers(self, capture_dirs):
        """Start audio analysis workers for all capture directories"""
        for capture_dir in capture_dirs:
            thread = threading.Thread(
                target=self.audio_worker,
                args=(capture_dir,),
                daemon=True
            )
            thread.start()
            self.audio_threads[capture_dir] = thread
            print(f"[@capture_monitor] Started audio thread for: {capture_dir}")
            
    def should_process_file(self, file_path):
        """Check if file should be processed"""
        # Only process jpg files
        if not file_path.endswith('.jpg'):
            return False
            
        # Skip thumbnails (they will be processed when the original is processed)
        if '_thumbnail' in file_path:
            return False
            
        # Skip if already processed
        if file_path in self.processed_files:
            return False
            
        # Skip temporary files
        if file_path.endswith('.tmp'):
            return False
            
        return True
        
    def scan_and_process_files(self, capture_dirs):
        """Scan directories for new files and process them"""
        for capture_dir in capture_dirs:
            if not self.running:
                break
                
            try:
                # Look for capture files
                pattern = os.path.join(capture_dir, "capture_*.jpg")
                files = glob.glob(pattern)
                
                # Sort by modification time (oldest first)
                files.sort(key=os.path.getmtime)
                
                for file_path in files:
                    if not self.running:
                        break
                        
                    if self.should_process_file(file_path):
                        # Mark as processed immediately to avoid duplicates
                        self.processed_files.add(file_path)
                        
                        # Process in background thread to avoid blocking
                        thread = threading.Thread(
                            target=self.process_frame,
                            args=(file_path,),
                            daemon=True
                        )
                        thread.start()
                        
                        # Limit concurrent processing
                        if threading.active_count() > 10:
                            thread.join()
                            
            except Exception as e:
                print(f"[@capture_monitor] Error scanning {capture_dir}: {e}")
                
    def cleanup_processed_files(self):
        """Clean up old entries from processed files set"""
        if len(self.processed_files) > 1000:
            # Keep only files that still exist
            existing_files = {f for f in self.processed_files if os.path.exists(f)}
            self.processed_files = existing_files
            print(f"[@capture_monitor] Cleaned up processed files cache: {len(existing_files)} remaining")
            
    def run(self):
        """Main monitoring loop"""
        print(f"[@capture_monitor] Starting Capture Monitor Service")
        print(f"[@capture_monitor] Host: {HOST_NAME}")
        print(f"[@capture_monitor] Scripts: {SCRIPTS_DIR}")
        print(f"[@capture_monitor] PID: {os.getpid()}")
        
        # Get existing directories
        capture_dirs = self.get_existing_directories()
        if not capture_dirs:
            print(f"[@capture_monitor] No capture directories found, exiting")
            return
            
        # Start audio analysis workers
        self.start_audio_workers(capture_dirs)
        
        # Start alert processor service
        self.start_alert_processor()
        
        print(f"[@capture_monitor] Monitoring started, checking every 3 seconds")
        
        last_cleanup = time.time()
        
        while self.running:
            try:
                # Scan for new files
                self.scan_and_process_files(capture_dirs)
                
                # Periodic cleanup
                if time.time() - last_cleanup > 300:  # Every 5 minutes
                    self.cleanup_processed_files()
                    last_cleanup = time.time()
                
                # Wait before next scan
                time.sleep(3)
                
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
    print(f"[@capture_monitor] Capture Monitor Service v1.0")
    
    monitor = CaptureMonitor()
    
    try:
        monitor.run()
    except Exception as e:
        print(f"[@capture_monitor] Fatal error: {e}")
        sys.exit(1)
        
if __name__ == '__main__':
    main() 