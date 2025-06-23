"""
Controller Manager

Handles the creation and organization of controllers for devices.
"""

import os
from typing import Dict, List, Any, Optional
from ..models.host import Host
from ..models.device import Device
from ..controllers.controller_config_factory import create_controller_configs_from_device_info


def create_host_from_environment() -> Host:
    """
    Create a Host with all its devices and controllers from environment variables.
    
    Returns:
        Host instance with all devices and controllers configured
    """
    # Get host info from environment
    host_ip = os.getenv('HOST_IP', '127.0.0.1')
    host_port = int(os.getenv('HOST_PORT', '5000'))
    host_name = os.getenv('HOST_NAME', 'unnamed-host')
    
    print(f"[@controller_manager:create_host_from_environment] Creating host: {host_name} ({host_ip}:{host_port})")
    
    # Create host
    host = Host(host_ip, host_port, host_name)
    
    # Create devices from environment variables
    devices_config = _get_devices_config_from_environment()
    
    for device_config in devices_config:
        device = _create_device_with_controllers(device_config)
        host.add_device(device)
        print(f"[@controller_manager:create_host_from_environment] Added device: {device.device_id} ({device.name})")
    
    print(f"[@controller_manager:create_host_from_environment] Host created with {host.get_device_count()} devices")
    return host


def _get_devices_config_from_environment() -> List[Dict[str, Any]]:
    """
    Extract device configurations from environment variables.
    
    Returns:
        List of device configurations
    """
    devices_config = []
    
    # Look for DEVICE1, DEVICE2, DEVICE3, DEVICE4
    for i in range(1, 5):
        device_name = os.getenv(f'DEVICE{i}_NAME')
        
        if device_name:
            device_config = {
                'device_id': f'device{i}',
                'name': device_name,
                'model': os.getenv(f'DEVICE{i}_MODEL', 'unknown'),
                'video': os.getenv(f'DEVICE{i}_video'),
                'video_stream_path': os.getenv(f'DEVICE{i}_video_stream_path'),
                'video_capture_path': os.getenv(f'DEVICE{i}_video_capture_path'),
                'android_ip': os.getenv(f'DEVICE{i}_android_ip'),
                'android_port': os.getenv(f'DEVICE{i}_android_port'),
                'appium_ip': os.getenv(f'DEVICE{i}_appium_ip'),
                'appium_port': os.getenv(f'DEVICE{i}_appium_port'),
                'ir_device': os.getenv(f'DEVICE{i}_ir_device'),
                'bluetooth_device': os.getenv(f'DEVICE{i}_bluetooth_device'),
                'power_device': os.getenv(f'DEVICE{i}_power_device'),
            }
            
            # Remove None values
            device_config = {k: v for k, v in device_config.items() if v is not None}
            devices_config.append(device_config)
    
    return devices_config


def _create_device_with_controllers(device_config: Dict[str, Any]) -> Device:
    """
    Create a device with all its controllers from configuration.
    
    Args:
        device_config: Device configuration dictionary
        
    Returns:
        Device instance with controllers
    """
    device_id = device_config['device_id']
    name = device_config['name']
    model = device_config['model']
    
    print(f"[@controller_manager:_create_device_with_controllers] Creating device: {device_id}")
    
    # Create device
    device = Device(device_id, name, model)
    
    # Create controllers using the factory
    controller_configs = create_controller_configs_from_device_info(device_config)
    
    for controller_config in controller_configs:
        controller_type = controller_config['type']
        controller_class = controller_config['class']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating {controller_type} controller: {controller_class.__name__}")
        
        # Create controller instance
        controller = controller_class(**controller_params)
        
        # Add to device
        device.add_controller(controller_type, controller)
    
    print(f"[@controller_manager:_create_device_with_controllers] Device {device_id} created with capabilities: {device.get_capabilities()}")
    return device


# Global host instance
_host_instance: Optional[Host] = None


def get_host() -> Host:
    """
    Get the global host instance, creating it if necessary.
    
    Returns:
        Host instance
    """
    global _host_instance
    
    if _host_instance is None:
        _host_instance = create_host_from_environment()
    
    return _host_instance


def reset_host():
    """
    Reset the global host instance (for testing).
    """
    global _host_instance
    _host_instance = None 