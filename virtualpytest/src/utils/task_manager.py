"""
Simple Task Manager for Async Browser-Use Tasks
"""
import threading
import time
from typing import Dict, Any, Optional
import uuid

class TaskManager:
    """Thread-safe task manager for browser-use tasks"""
    
    def __init__(self):
        self._tasks: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
    
    def create_task(self, command: str, params: Dict[str, Any]) -> str:
        """Create a new task and return task_id"""
        task_id = str(uuid.uuid4())
        
        with self._lock:
            self._tasks[task_id] = {
                'id': task_id,
                'command': command,
                'params': params,
                'status': 'started',
                'created_at': time.time(),
                'completed_at': None,
                'result': None,
                'error': None
            }
        
        return task_id
    
    def complete_task(self, task_id: str, result: Dict[str, Any], error: str = None):
        """Mark task as completed with result"""
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id].update({
                    'status': 'completed' if not error else 'failed',
                    'completed_at': time.time(),
                    'result': result,
                    'error': error
                })
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task by ID"""
        with self._lock:
            return self._tasks.get(task_id)
    
    def cleanup_old_tasks(self, max_age_seconds: int = 3600):
        """Remove tasks older than max_age_seconds"""
        current_time = time.time()
        with self._lock:
            to_remove = [
                task_id for task_id, task in self._tasks.items()
                if current_time - task['created_at'] > max_age_seconds
            ]
            for task_id in to_remove:
                del self._tasks[task_id]

# Global task manager instance
task_manager = TaskManager() 