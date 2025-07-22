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

AUDIO_ANALYSIS_INTERVAL = 5   # seconds
FRAME_ANALYSIS_INTERVAL = 1   # Process every second for better coverage

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

    def find_recent_unanalyzed_frames(self, capture_dir, max_frames=5):
        """Find recent frames that don't have JSON analysis files yet"""
        try:
            pattern = os.path.join(capture_dir, "capture_*.jpg")
            frames = glob.glob(pattern)
            if not frames:
                return []

            # Filter out thumbnail files - only process original images
            original_frames = [f for f in frames if '_thumbnail' not in f]
            if not original_frames:
                return []

            # Sort by modification time, get most recent frames
            original_frames.sort(key=os.path.getmtime, reverse=True)
            
            # Find frames without JSON files (limit to recent ones)
            unanalyzed = []
            for frame_path in original_frames[:max_frames * 2]:  # Check more frames
                json_path = frame_path.replace('.jpg', '.json')
                if not os.path.exists(json_path):
                    unanalyzed.append(frame_path)
                    if len(unanalyzed) >= max_frames:
                        break
            
            return unanalyzed
            
        except Exception as e:
            print(f"[@capture_monitor] Error finding recent frames in {capture_dir}: {e}")
            return []

    def process_recent_frames(self, capture_dir):
        """Process recent unanalyzed frames in a capture directory"""
        try:
            # Find recent frames that need analysis
            unanalyzed_frames = self.find_recent_unanalyzed_frames(capture_dir, max_frames=3)
            
            if not unanalyzed_frames:
                return
                
            print(f"[@capture_monitor] Found {len(unanalyzed_frames)} unanalyzed frames in {os.path.basename(capture_dir)}")
            
            # Process each frame (most recent first)
            for frame_path in unanalyzed_frames:
                if not self.running:
                    break
                
                # Check if thumbnail exists (required for thumbnail-only processing)
                thumbnail_path = frame_path.replace('.jpg', '_thumbnail.jpg')
                if not os.path.exists(thumbnail_path):
                    print(f"[@capture_monitor] Skipping {os.path.basename(frame_path)} - thumbnail not found")
                    continue
                    
                # Wait a bit to ensure files are fully written
                time.sleep(0.5)
                
                # Check if files still exist and are readable
                if not os.path.exists(frame_path) or not os.path.exists(thumbnail_path):
                    print(f"[@capture_monitor] Frame or thumbnail disappeared: {os.path.basename(frame_path)}")
                    continue
                    
                print(f"[@capture_monitor] Processing frame (thumbnail-only): {os.path.basename(frame_path)}")
                
                # Run frame analysis with ORIGINAL path (analyze_frame.py will find the thumbnail)
                # This ensures the JSON file is named correctly (capture_*.json, not capture_*_thumbnail.json)
                cmd = [
                    "bash", "-c",
                    f"source {VENV_PATH} && python {SCRIPTS_DIR}/analyze_frame.py '{frame_path}' '{HOST_NAME}'"
                ]
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=15,  # Reduced timeout for faster processing
                    cwd=os.path.dirname(frame_path)
                )
                
                if result.returncode == 0:
                    print(f"[@capture_monitor] Frame analysis completed: {os.path.basename(frame_path)}")
                else:
                    print(f"[@capture_monitor] Frame analysis failed: {result.stderr}")
                    
        except subprocess.TimeoutExpired:
            print(f"[@capture_monitor] Frame analysis timeout: {frame_path}")
        except Exception as e:
            print(f"[@capture_monitor] Frame analysis error: {e}")

    def has_recent_audio_activity(self, main_capture_dir):
        """Check if capture directory has recent HLS segments (within 30 seconds)"""
        try:
            import glob
            import time
            
            pattern = os.path.join(main_capture_dir, "segment_*.ts")
            segments = glob.glob(pattern)
            
            if not segments:
                return False
                
            # Get the newest segment
            latest = max(segments, key=os.path.getmtime)
            latest_mtime = os.path.getmtime(latest)
            current_time = time.time()
            age_seconds = current_time - latest_mtime
            
            # Consider active if newest segment is less than 30 seconds old
            return age_seconds <= 30
            
        except Exception as e:
            print(f"[@capture_monitor] Error checking audio activity for {main_capture_dir}: {e}")
            return False

    def process_audio(self, capture_dir):
        """Process audio for a capture directory"""
        try:
            # Get parent directory (remove /captures suffix)
            main_capture_dir = os.path.dirname(capture_dir)
            
            if not os.path.exists(main_capture_dir):
                return
            
            # Skip if no recent audio activity (prevents phantom alerts from stale segments)
            if not self.has_recent_audio_activity(main_capture_dir):
                # Only log occasionally to avoid spam
                device_name = os.path.basename(main_capture_dir)
                if hasattr(self, '_last_audio_skip_log'):
                    if time.time() - self._last_audio_skip_log.get(device_name, 0) < 60:  # Log once per minute
                        return
                else:
                    self._last_audio_skip_log = {}
                
                self._last_audio_skip_log[device_name] = time.time()
                print(f"[@capture_monitor] Skipping audio analysis for {device_name} - no recent segments")
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
                # Don't log stderr if it's just about stale segments (expected behavior now)
                if "too old" not in result.stderr and "no recent segments" not in result.stderr:
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
                self.process_recent_frames(capture_dir)
                
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
        print(f"[@capture_monitor] Starting Capture Monitor Service v2.2 - MULTI-FRAME PROCESSING")
        print(f"[@capture_monitor] Host: {HOST_NAME}")
        print(f"[@capture_monitor] Scripts: {SCRIPTS_DIR}")
        print(f"[@capture_monitor] Frame analysis interval: {FRAME_ANALYSIS_INTERVAL}s (processes up to 3 recent unanalyzed frames)")
        print(f"[@capture_monitor] Audio analysis interval: {AUDIO_ANALYSIS_INTERVAL}s")
        print(f"[@capture_monitor] PID: {os.getpid()}")
        
        # Perform aggressive startup cleanup to prevent phantom alerts
        try:
            print(f"[@capture_monitor] Performing aggressive startup cleanup...")
            sys.path.append(SCRIPTS_DIR)
            from alert_manager import startup_cleanup_on_restart
            startup_cleanup_on_restart()
        except Exception as e:
            print(f"[@capture_monitor] Aggressive startup cleanup failed (continuing anyway): {e}")
        
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
        
        print(f"[@capture_monitor] All workers started - multi-frame processing (up to 3 frames per cycle)")
        
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
    print(f"[@capture_monitor] Capture Monitor Service v2.2 - Multi-Frame Processing")
    
    monitor = CaptureMonitor()
    
    try:
        monitor.run()
    except Exception as e:
        print(f"[@capture_monitor] Fatal error: {e}")
        sys.exit(1)
        
if __name__ == '__main__':
    main() 