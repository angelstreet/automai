"""
Host Model

Represents a host that contains multiple devices.
"""

from typing import Dict, List, Optional, Any
from .device import Device


class Host:
    """
    A host that contains multiple devices.
    
    Example usage:
        host = Host("192.168.1.100", 5000, "test-host", "https://virtualpytest.com")
        device1 = host.get_device("device1")
        av_controller = host.get_device("device1").get_controller('av')
        
        # Or shorthand for single device operations
        av_controller = host.get_controller("device1", 'av')
    """
    
    def __init__(self, host_ip: str, host_port: int, host_name: str, host_url: str = None):
        """
        Initialize a host.
        
        Args:
            host_ip: Host IP address
            host_port: Host port
            host_name: Host name
            host_url: Complete host URL (e.g., "https://virtualpytest.com")
        """
        self.host_ip = host_ip
        self.host_port = host_port
        self.host_name = host_name
        self.host_url = host_url
        
        # Devices organized by device_id
        self._devices: Dict[str, Device] = {}
        
        # System information
        self.system_info: Dict[str, Any] = {}
    
    def add_device(self, device: Device):
        """
        Add a device to this host.
        
        Args:
            device: Device instance to add
        """
        self._devices[device.device_id] = device
    
    def get_device(self, device_id: str) -> Optional[Device]:
        """
        Get a device by its ID.
        
        Args:
            device_id: Device identifier (e.g., 'device1', 'device2')
            
        Returns:
            Device instance or None if not found
        """
        return self._devices.get(device_id)
    
    def get_devices(self) -> List[Device]:
        """
        Get all devices in this host.
        
        Returns:
            List of all devices
        """
        return list(self._devices.values())
    
    def get_device_ids(self) -> List[str]:
        """
        Get all device IDs in this host.
        
        Returns:
            List of device IDs
        """
        return list(self._devices.keys())
    
    def get_controller(self, device_id: str, controller_type: str):
        """
        Shorthand to get a controller from a specific device.
        
        Args:
            device_id: Device identifier
            controller_type: Controller type ('av', 'remote', etc.)
            
        Returns:
            Controller instance or None if not found
        """
        device = self.get_device(device_id)
        if device:
            return device.get_controller(controller_type)
        return None
    
    def get_controllers(self, device_id: str, controller_type: str):
        """
        Shorthand to get all controllers of a type from a specific device.
        
        Args:
            device_id: Device identifier
            controller_type: Controller type ('av', 'remote', etc.)
            
        Returns:
            List of controllers
        """
        device = self.get_device(device_id)
        if device:
            return device.get_controllers(controller_type)
        return []
    
    def has_device(self, device_id: str) -> bool:
        """
        Check if host has a specific device.
        
        Args:
            device_id: Device identifier to check
            
        Returns:
            True if device exists
        """
        return device_id in self._devices
    
    def get_device_count(self) -> int:
        """
        Get the number of devices in this host.
        
        Returns:
            Number of devices
        """
        return len(self._devices)
    
    def get_all_capabilities(self) -> List[str]:
        """
        Get all capabilities across all devices.
        
        Returns:
            List of unique capabilities
        """
        all_capabilities = []
        for device in self._devices.values():
            for cap in device.get_capabilities():
                if cap not in all_capabilities:
                    all_capabilities.append(cap)
        return all_capabilities
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert host to dictionary for serialization.
        
        Returns:
            Dictionary representation of the host
        """
        result = {
            'host_ip': self.host_ip,
            'host_port': self.host_port,
            'host_name': self.host_name,
            'device_count': self.get_device_count(),
            'devices': [device.to_dict() for device in self._devices.values()],
            'capabilities': self.get_all_capabilities(),
            'system_info': self.system_info
        }
        
        # Include host_url if available
        if self.host_url:
            result['host_url'] = self.host_url
            
        return result 