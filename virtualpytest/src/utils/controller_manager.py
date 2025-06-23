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
                # Video configuration
                'video': os.getenv(f'DEVICE{i}_VIDEO'),
                'video_stream_path': os.getenv(f'DEVICE{i}_VIDEO_STREAM_PATH'),
                'video_capture_path': os.getenv(f'DEVICE{i}_VIDEO_CAPTURE_PATH'),
                # Device IP/Port (used by both Android ADB and Appium - mutually exclusive)
                'device_ip': os.getenv(f'DEVICE{i}_IP'),
                'device_port': os.getenv(f'DEVICE{i}_PORT'),
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
    Handles controller dependencies by creating them in the right order.
    
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
    
    # Separate controllers by type to handle dependencies
    av_controllers = [c for c in controller_configs if c['type'] == 'av']
    remote_controllers = [c for c in controller_configs if c['type'] == 'remote']
    verification_controllers = [c for c in controller_configs if c['type'] == 'verification']
    power_controllers = [c for c in controller_configs if c['type'] == 'power']
    
    # Step 1: Create AV controllers first (no dependencies)
    av_controller = None
    for controller_config in av_controllers:
        controller_type = controller_config['type']
        controller_class = controller_config['class']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating {controller_type} controller: {controller_class.__name__}")
        
        controller = controller_class(**controller_params)
        device.add_controller(controller_type, controller)
        av_controller = controller  # Keep reference for verification controllers
    
    # Step 2: Create remote controllers (no dependencies)
    for controller_config in remote_controllers:
        controller_type = controller_config['type']
        controller_class = controller_config['class']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating {controller_type} controller: {controller_class.__name__}")
        
        controller = controller_class(**controller_params)
        device.add_controller(controller_type, controller)
    
    # Step 3: Create verification controllers (depend on AV controller)
    for controller_config in verification_controllers:
        controller_type = controller_config['type']
        controller_class = controller_config['class']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating verification controller: {controller_class.__name__}")
        
        # Add av_controller dependency for verification controllers that need it
        # ADB verification controller doesn't need av_controller (uses direct ADB communication)
        if controller_class.__name__ in ['ImageVerificationController', 'TextVerificationController', 'AudioVerificationController', 'VideoVerificationController']:
            if av_controller:
                controller_params['av_controller'] = av_controller
            else:
                print(f"[@controller_manager:_create_device_with_controllers] WARNING: {controller_class.__name__} needs AV controller but none available")
        
        controller = controller_class(**controller_params)
        device.add_controller(controller_type, controller)
    
    # Step 4: Create power controllers (no dependencies)
    for controller_config in power_controllers:
        controller_type = controller_config['type']
        controller_class = controller_config['class']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating {controller_type} controller: {controller_class.__name__}")
        
        controller = controller_class(**controller_params)
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