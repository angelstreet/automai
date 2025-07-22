#!/usr/bin/env python3
"""
Alert Cleanup Utility
Cleans up local alert state files when database alerts are cleared
Usage: cleanup_alerts.py [--force]
"""

import sys
import os

# Add the current directory to sys.path to import alert_manager
sys.path.append(os.path.dirname(__file__))

try:
    from alert_manager import startup_cleanup_if_database_empty, cleanup_local_state_files, cleanup_alert_queue
except ImportError as e:
    print(f"Error: Could not import alert_manager: {e}")
    sys.exit(1)

def main():
    """Main cleanup function."""
    print("[@cleanup_alerts] Alert Cleanup Utility v1.0")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--force":
        print("[@cleanup_alerts] Force cleanup requested - removing ALL local state files")
        cleanup_local_state_files()
        cleanup_alert_queue()
        print("[@cleanup_alerts] Force cleanup completed")
    else:
        print("[@cleanup_alerts] Smart cleanup - only clean if database is empty")
        startup_cleanup_if_database_empty()
        print("[@cleanup_alerts] Smart cleanup completed")
    
    print("[@cleanup_alerts] Cleanup utility finished")

if __name__ == '__main__':
    main() 