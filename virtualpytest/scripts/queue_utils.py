#!/usr/bin/env python3
"""
Queue Utilities for Alert Processing
Provides functions to write analysis results to the alert queue
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, Any

# Configuration
QUEUE_DIR = "/tmp/alert_queue"

def ensure_queue_directory():
    """Ensure the queue directory exists"""
    try:
        os.makedirs(QUEUE_DIR, exist_ok=True)
        return True
    except Exception as e:
        print(f"[queue_utils] Error creating queue directory: {e}")
        return False

def write_to_alert_queue(
    analysis_result: Dict[Any, Any],
    host_name: str,
    analysis_path: str,
    analysis_type: str = "frame"
) -> bool:
    """
    Write analysis result to the alert queue for background processing.
    
    Args:
        analysis_result: The analysis result from analyze_frame.py or analyze_audio.py
        host_name: Host name for the alert
        analysis_path: Path to the analyzed file/directory
        analysis_type: Type of analysis ("frame" or "audio")
    
    Returns:
        bool: True if successfully queued, False otherwise
    """
    try:
        # Ensure queue directory exists
        if not ensure_queue_directory():
            return False
        
        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # microseconds to milliseconds
        filename = f"alert_{analysis_type}_{timestamp}.json"
        file_path = os.path.join(QUEUE_DIR, filename)
        
        # Prepare queue data
        queue_data = {
            "timestamp": datetime.now().isoformat(),
            "analysis_type": analysis_type,
            "host_name": host_name,
            "analysis_path": analysis_path,
            "analysis_result": analysis_result,
            "queued_at": time.time()
        }
        
        # Write to queue file atomically
        temp_path = file_path + ".tmp"
        with open(temp_path, 'w') as f:
            json.dump(queue_data, f, indent=2)
        
        # Atomic move to final location
        os.rename(temp_path, file_path)
        
        print(f"[queue_utils] Queued alert: {filename}")
        return True
        
    except Exception as e:
        print(f"[queue_utils] Error writing to queue: {e}")
        # Clean up temp file if it exists
        temp_path = file_path + ".tmp" if 'file_path' in locals() else None
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
        return False

def get_queue_status() -> Dict[str, Any]:
    """
    Get current queue status for monitoring.
    
    Returns:
        dict: Queue status information
    """
    try:
        if not os.path.exists(QUEUE_DIR):
            return {
                "queue_exists": False,
                "pending_count": 0,
                "oldest_pending": None,
                "queue_size_mb": 0
            }
        
        # Count pending files
        import glob
        pending_files = glob.glob(os.path.join(QUEUE_DIR, "alert_*.json"))
        pending_count = len(pending_files)
        
        # Find oldest pending file
        oldest_pending = None
        if pending_files:
            oldest_file = min(pending_files, key=os.path.getmtime)
            oldest_pending = datetime.fromtimestamp(os.path.getmtime(oldest_file)).isoformat()
        
        # Calculate queue directory size
        queue_size = 0
        for file_path in pending_files:
            try:
                queue_size += os.path.getsize(file_path)
            except:
                pass
        
        return {
            "queue_exists": True,
            "pending_count": pending_count,
            "oldest_pending": oldest_pending,
            "queue_size_mb": round(queue_size / (1024 * 1024), 2),
            "queue_directory": QUEUE_DIR
        }
        
    except Exception as e:
        print(f"[queue_utils] Error getting queue status: {e}")
        return {
            "queue_exists": False,
            "error": str(e),
            "pending_count": 0,
            "oldest_pending": None,
            "queue_size_mb": 0
        }

def cleanup_queue(max_age_minutes: int = 30) -> int:
    """
    Clean up old queue files (emergency cleanup).
    
    Args:
        max_age_minutes: Maximum age of files to keep
        
    Returns:
        int: Number of files cleaned up
    """
    try:
        if not os.path.exists(QUEUE_DIR):
            return 0
            
        import glob
        cutoff_time = time.time() - (max_age_minutes * 60)
        queue_files = glob.glob(os.path.join(QUEUE_DIR, "alert_*.json"))
        
        cleaned_count = 0
        for file_path in queue_files:
            try:
                if os.path.getmtime(file_path) < cutoff_time:
                    os.remove(file_path)
                    cleaned_count += 1
                    print(f"[queue_utils] Cleaned up old file: {os.path.basename(file_path)}")
            except Exception as e:
                print(f"[queue_utils] Error cleaning up {file_path}: {e}")
                
        return cleaned_count
        
    except Exception as e:
        print(f"[queue_utils] Error during cleanup: {e}")
        return 0

def main():
    """Test function for queue utilities"""
    print("Queue Utilities Test")
    
    # Test queue status
    status = get_queue_status()
    print(f"Queue Status: {status}")
    
    # Test writing to queue
    test_result = {
        "analysis": {
            "blackscreen": False,
            "freeze": True,
            "errors": False
        }
    }
    
    success = write_to_alert_queue(
        analysis_result=test_result,
        host_name="test-host",
        analysis_path="/tmp/test.jpg",
        analysis_type="frame"
    )
    
    print(f"Queue write test: {'SUCCESS' if success else 'FAILED'}")
    
    # Check status again
    status = get_queue_status()
    print(f"Queue Status After Test: {status}")

if __name__ == '__main__':
    main() 