#!/usr/bin/env python3
"""
Alert Processor Background Service
Monitors alert queue and processes alerts asynchronously to avoid impacting video capture
"""

import os
import json
import sys
import time
import glob
import signal
from datetime import datetime
from typing import Dict, List

# Load environment variables from .env file
def load_env():
    """Load environment variables from .env file in the same directory"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print(f"[@alert_processor] Loaded environment variables from {env_path}")
    else:
        print(f"[@alert_processor] Warning: .env file not found at {env_path}")

# Load .env before importing other modules
load_env()

# Add the parent directory to sys.path to import alert_manager
sys.path.append(os.path.dirname(__file__))

try:
    from alert_manager import check_and_update_alerts
except ImportError as e:
    print(f"Error: Could not import alert_manager: {e}")
    sys.exit(1)

# Configuration
QUEUE_DIR = "/tmp/alert_queue"
PROCESSED_DIR = "/tmp/alert_queue/processed"
CHECK_INTERVAL = 2  # seconds
MAX_QUEUE_AGE = 300  # 5 minutes - cleanup old files

class AlertProcessor:
    def __init__(self):
        self.running = True
        self.processed_count = 0
        self.setup_signal_handlers()
        self.ensure_directories()
        
    def setup_signal_handlers(self):
        """Setup graceful shutdown on SIGTERM/SIGINT"""
        signal.signal(signal.SIGTERM, self.shutdown)
        signal.signal(signal.SIGINT, self.shutdown)
        
    def shutdown(self, signum, frame):
        """Graceful shutdown handler"""
        print(f"[@alert_processor] Received signal {signum}, shutting down gracefully...")
        self.running = False
        
    def ensure_directories(self):
        """Create queue directories if they don't exist"""
        try:
            os.makedirs(QUEUE_DIR, exist_ok=True)
            os.makedirs(PROCESSED_DIR, exist_ok=True)
            print(f"[@alert_processor] Queue directory: {QUEUE_DIR}")
        except Exception as e:
            print(f"[@alert_processor] Error creating directories: {e}")
            sys.exit(1)
            
    def scan_queue(self) -> List[str]:
        """Scan queue directory for pending alert files"""
        try:
            pattern = os.path.join(QUEUE_DIR, "alert_*.json")
            files = glob.glob(pattern)
            # Sort by modification time (oldest first)
            files.sort(key=os.path.getmtime)
            return files
        except Exception as e:
            print(f"[@alert_processor] Error scanning queue: {e}")
            return []
            
    def process_alert_file(self, file_path: str) -> bool:
        """Process a single alert file from the queue"""
        try:
            print(f"[@alert_processor] Processing: {os.path.basename(file_path)}")
            
            # Read alert data
            with open(file_path, 'r') as f:
                alert_data = json.load(f)
                
            # Extract required fields
            analysis_result = alert_data.get('analysis_result')
            host_name = alert_data.get('host_name')
            analysis_path = alert_data.get('analysis_path')
            timestamp = alert_data.get('timestamp')
            
            if not all([analysis_result, host_name, analysis_path]):
                print(f"[@alert_processor] Invalid alert data in {file_path}")
                return False
                
            # Process the alert using existing alert manager
            check_and_update_alerts(
                analysis_result=analysis_result,
                host_name=host_name,
                analysis_path=analysis_path
            )
            
            print(f"[@alert_processor] Successfully processed alert from {timestamp}")
            return True
            
        except json.JSONDecodeError as e:
            print(f"[@alert_processor] Invalid JSON in {file_path}: {e}")
            return False
        except Exception as e:
            print(f"[@alert_processor] Error processing {file_path}: {e}")
            return False
            
    def move_to_processed(self, file_path: str):
        """Move processed file to processed directory"""
        try:
            filename = os.path.basename(file_path)
            processed_path = os.path.join(PROCESSED_DIR, filename)
            os.rename(file_path, processed_path)
            print(f"[@alert_processor] Moved to processed: {filename}")
        except Exception as e:
            print(f"[@alert_processor] Error moving file: {e}")
            # If move fails, just delete the original
            try:
                os.remove(file_path)
                print(f"[@alert_processor] Deleted original file: {os.path.basename(file_path)}")
            except:
                pass
                
    def cleanup_old_files(self):
        """Clean up old processed files"""
        try:
            cutoff_time = time.time() - MAX_QUEUE_AGE
            pattern = os.path.join(PROCESSED_DIR, "alert_*.json")
            old_files = [f for f in glob.glob(pattern) if os.path.getmtime(f) < cutoff_time]
            
            for old_file in old_files:
                os.remove(old_file)
                print(f"[@alert_processor] Cleaned up old file: {os.path.basename(old_file)}")
                
        except Exception as e:
            print(f"[@alert_processor] Error during cleanup: {e}")
            
    def run(self):
        """Main processing loop"""
        print(f"[@alert_processor] Starting alert processor service...")
        print(f"[@alert_processor] Monitoring queue: {QUEUE_DIR}")
        print(f"[@alert_processor] Check interval: {CHECK_INTERVAL}s")
        
        last_cleanup = time.time()
        
        while self.running:
            try:
                # Scan for pending alerts
                queue_files = self.scan_queue()
                
                if queue_files:
                    print(f"[@alert_processor] Found {len(queue_files)} pending alerts")
                    
                    for file_path in queue_files:
                        if not self.running:
                            break
                            
                        # Process the alert
                        if self.process_alert_file(file_path):
                            self.processed_count += 1
                            self.move_to_processed(file_path)
                        else:
                            # Move failed files to processed with error suffix
                            error_path = file_path.replace('.json', '_error.json')
                            try:
                                os.rename(file_path, error_path)
                                print(f"[@alert_processor] Marked as error: {os.path.basename(error_path)}")
                            except:
                                os.remove(file_path)
                                
                # Periodic cleanup (every 5 minutes)
                if time.time() - last_cleanup > 300:
                    self.cleanup_old_files()
                    last_cleanup = time.time()
                    print(f"[@alert_processor] Status: {self.processed_count} alerts processed")
                    
                # Wait before next check
                time.sleep(CHECK_INTERVAL)
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"[@alert_processor] Unexpected error in main loop: {e}")
                time.sleep(CHECK_INTERVAL)
                
        print(f"[@alert_processor] Shutting down. Total processed: {self.processed_count}")

def main():
    """Main entry point"""
    print(f"[@alert_processor] Alert Processor Service v1.0")
    print(f"[@alert_processor] PID: {os.getpid()}")
    
    processor = AlertProcessor()
    
    try:
        processor.run()
    except Exception as e:
        print(f"[@alert_processor] Fatal error: {e}")
        sys.exit(1)
        
if __name__ == '__main__':
    main() 