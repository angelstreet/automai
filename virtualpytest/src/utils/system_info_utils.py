"""
System Information Utilities

Utility functions for system monitoring, process management, and environment validation.
"""

import os
import psutil
import hashlib
import platform


def get_host_system_stats():
    """Get basic system statistics for host registration"""
    try:
        return {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_percent': psutil.disk_usage('/').percent,
            'platform': platform.system(),
            'architecture': platform.machine(),
            'python_version': platform.python_version()
        }
    except Exception as e:
        print(f"⚠️ Error getting system stats: {e}")
        return {
            'cpu_percent': 0,
            'memory_percent': 0,
            'disk_percent': 0,
            'platform': 'unknown',
            'architecture': 'unknown',
            'python_version': 'unknown'
        } 