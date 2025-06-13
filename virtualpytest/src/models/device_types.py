"""
Shared Device/Host Types for Python Backend

These types mirror the TypeScript types in:
- src/web/types/common/Host_Types.ts (Host Types section)
- src/web/types/pages/Dashboard_Types.ts (SystemStats for dashboard display)

This ensures type consistency between frontend and backend.
Note: SystemStats is defined in Dashboard_Types.ts since it's specifically for dashboard display.
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from datetime import datetime


@dataclass
class SystemStats:
    """System resource usage statistics"""
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    platform: str
    architecture: str
    python_version: str
    error: Optional[str] = None


@dataclass
class DeviceConnection:
    """Device connection information"""
    flask_url: str
    host_url: str


@dataclass
class DeviceRegistration:
    """Core device registration data as returned by server API"""
    
    # Server-provided core fields
    id: str                           # Device ID from server
    name: str                         # Device name
    host_name: str                   # Host name (e.g., "mac-host")
    model: str                       # Device model
    status: str                      # Device status (online/offline)
    last_seen: float                 # Unix timestamp
    registered_at: str               # ISO timestamp string
    capabilities: List[str]          # Device capabilities
    system_stats: SystemStats       # System resource usage
    connection: DeviceConnection    # Connection URLs
    
    # Optional fields
    description: Optional[str] = None
    
    # Device lock management
    isLocked: bool = False
    lockedBy: Optional[str] = None
    lockedAt: Optional[float] = None
    
    # Controller configuration
    controller_types: Optional[List[str]] = None
    controller_configs: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'name': self.name,
            'host_name': self.host_name,
            'model': self.model,
            'description': self.description,
            'status': self.status,
            'last_seen': self.last_seen,
            'registered_at': self.registered_at,
            'capabilities': self.capabilities,
            'system_stats': {
                'cpu_percent': self.system_stats.cpu_percent,
                'memory_percent': self.system_stats.memory_percent,
                'disk_percent': self.system_stats.disk_percent,
                'platform': self.system_stats.platform,
                'architecture': self.system_stats.architecture,
                'python_version': self.system_stats.python_version,
                'error': self.system_stats.error,
            },
            'connection': {
                'flask_url': self.connection.flask_url,
                'host_url': self.connection.host_url,
            },
            'isLocked': self.isLocked,
            'lockedBy': self.lockedBy,
            'lockedAt': self.lockedAt,
            'controller_types': self.controller_types,
            'controller_configs': self.controller_configs,
        }


@dataclass
class DevicesResponse:
    """Server response structure for device list endpoint"""
    success: bool
    devices: Optional[List[DeviceRegistration]] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'success': self.success,
            'devices': [device.to_dict() for device in self.devices] if self.devices else None,
            'error': self.error,
        } 