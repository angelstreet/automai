"""
Controller Manager

Handles the creation and organization of controllers for devices.
"""

import os
from typing import Dict, List, Any, Optional
from ..models.host import Host
from ..models.device import Device
from ..controllers.controller_config_factory import create_controller_configs_from_device_info

# Import controller classes
from ..controllers.audiovideo.hdmi_stream import HDMIStreamController
from ..controllers.remote.android_mobile import AndroidMobileRemoteController
from ..controllers.remote.android_tv import AndroidTVRemoteController
from ..controllers.remote.appium_remote import AppiumRemoteController
from ..controllers.verification.image import ImageVerificationController
from ..controllers.verification.text import TextVerificationController
from ..controllers.verification.adb import ADBVerificationController
from ..controllers.verification.appium import AppiumVerificationController


def create_host_from_environment() -> Host:
    """
    Create a Host with all its devices and controllers from environment variables.
    
    Returns:
        Host instance with all devices and controllers configured
    """
    # Get host info from environment
    host_name = os.getenv('HOST_NAME', 'unnamed-host')
    host_port = int(os.getenv('HOST_PORT', '6109'))
    host_url = os.getenv('HOST_URL')
    
    # Parse HOST_URL to extract IP if needed, or use fallback
    host_ip = '127.0.0.1'  # Default fallback
    if host_url:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(host_url)
            if parsed.hostname:
                host_ip = parsed.hostname
        except Exception as e:
            print(f"[@controller_manager:create_host_from_environment] Warning: Could not parse HOST_URL {host_url}: {e}")
    
    print(f"[@controller_manager:create_host_from_environment] Creating host: {host_name}")
    print(f"[@controller_manager:create_host_from_environment]   Host URL: {host_url}")
    print(f"[@controller_manager:create_host_from_environment]   Host IP: {host_ip}")
    print(f"[@controller_manager:create_host_from_environment]   Host Port: {host_port}")
    
    # Create host with host_url parameter
    host = Host(host_ip, host_port, host_name, host_url)
    
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
    
    print("[@controller_manager:_get_devices_config_from_environment] DEBUG: Starting device configuration extraction")
    
    # Look for DEVICE1, DEVICE2, DEVICE3, DEVICE4
    for i in range(1, 5):
        device_name = os.getenv(f'DEVICE{i}_NAME')
        
        print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_NAME = {device_name}")
        
        if device_name:
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: Found device {i}, extracting all environment variables...")
            
            # Extract all environment variables for this device
            device_model = os.getenv(f'DEVICE{i}_MODEL', 'unknown')
            video = os.getenv(f'DEVICE{i}_VIDEO')
            video_stream_path = os.getenv(f'DEVICE{i}_VIDEO_STREAM_PATH')
            video_capture_path = os.getenv(f'DEVICE{i}_VIDEO_CAPTURE_PATH')
            device_ip = os.getenv(f'DEVICE{i}_IP')
            device_port = os.getenv(f'DEVICE{i}_PORT')
            ir_device = os.getenv(f'DEVICE{i}_ir_device')
            bluetooth_device = os.getenv(f'DEVICE{i}_bluetooth_device')
            power_device = os.getenv(f'DEVICE{i}_power_device')
            appium_platform_name = os.getenv(f'DEVICE{i}_APPIUM_PLATFORM_NAME')
            appium_device_id = os.getenv(f'DEVICE{i}_APPIUM_DEVICE_ID')
            appium_server_url = os.getenv(f'DEVICE{i}_APPIUM_SERVER_URL')
            
            # Print all extracted values
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_MODEL = {device_model}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_VIDEO = {video}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_VIDEO_STREAM_PATH = {video_stream_path}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_VIDEO_CAPTURE_PATH = {video_capture_path}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_IP = {device_ip}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_PORT = {device_port}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_ir_device = {ir_device}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_bluetooth_device = {bluetooth_device}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_power_device = {power_device}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_APPIUM_PLATFORM_NAME = {appium_platform_name}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_APPIUM_DEVICE_ID = {appium_device_id}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_APPIUM_SERVER_URL = {appium_server_url}")
            
            device_config = {
                'device_id': f'device{i}',
                'device_name': device_name,
                'device_model': device_model,
                # Video configuration
                'video': video,
                'video_stream_path': video_stream_path,
                'video_capture_path': video_capture_path,
                # Device IP/Port (used by both Android ADB and Appium - mutually exclusive)
                'device_ip': device_ip,
                'device_port': device_port,
                'ir_device': ir_device,
                'bluetooth_device': bluetooth_device,
                'power_device': power_device,
            }
            
            # Load Appium env vars directly into device_config (flat)
            if appium_platform_name:
                device_config['appium_platform_name'] = appium_platform_name
            
            if appium_device_id:
                device_config['appium_device_id'] = appium_device_id
                
            if appium_server_url:
                device_config['appium_server_url'] = appium_server_url
            
            # Remove None values
            device_config = {k: v for k, v in device_config.items() if v is not None}
            
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: Final device_config for DEVICE{i}:")
            for key, value in device_config.items():
                print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG:   {key} = {value}")
            
            devices_config.append(device_config)
    
    return devices_config


def _create_controller_instance(controller_type: str, implementation: str, params: Dict[str, Any]):
    """
    Create a controller instance based on type and implementation.
    
    Args:
        controller_type: Abstract type ('av', 'remote', 'verification', etc.)
        implementation: Specific implementation ('hdmi_stream', 'android_mobile', etc.)
        params: Constructor parameters
        
    Returns:
        Controller instance or None if not found
    """
    # AV Controllers
    if controller_type == 'av':
        if implementation == 'hdmi_stream':
            return HDMIStreamController(**params)
    
    # Remote Controllers
    elif controller_type == 'remote':
        if implementation == 'android_mobile':
            return AndroidMobileRemoteController(**params)
        elif implementation == 'android_tv':
            return AndroidTVRemoteController(**params)
        elif implementation == 'appium':
            return AppiumRemoteController(**params)
    
    # Verification Controllers
    elif controller_type == 'verification':
        if implementation == 'image':
            return ImageVerificationController(**params)
        elif implementation == 'text':
            return TextVerificationController(**params)
        elif implementation == 'adb':
            return ADBVerificationController(**params)
        elif implementation == 'appium':
            return AppiumVerificationController(**params)
    
    print(f"[@controller_manager:_create_controller_instance] WARNING: Unknown controller {controller_type}_{implementation}")
    return None


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
    name = device_config['device_name']
    model = device_config['device_model']
    
    print(f"[@controller_manager:_create_device_with_controllers] Creating device: {device_id}")
    
    # Create device with IP/port values and video paths for URL building
    device = Device(
        device_id, 
        name, 
        model,
        device_config.get('device_ip'),
        device_config.get('device_port'),
        device_config.get('video_stream_path'),
        device_config.get('video_capture_path')
    )
    
    # Create controllers using the factory (returns dict now)
    controller_configs = create_controller_configs_from_device_info(device_config)
    
    # Convert dict to list for processing
    controller_list = list(controller_configs.values())
    
    # Separate controllers by type to handle dependencies
    av_controllers = [c for c in controller_list if c['type'] == 'av']
    remote_controllers = [c for c in controller_list if c['type'] == 'remote']
    verification_controllers = [c for c in controller_list if c['type'] == 'verification']
    power_controllers = [c for c in controller_list if c['type'] == 'power']
    
    # Step 1: Create AV controllers first (no dependencies)  
    av_controller = None
    for controller_config in av_controllers:
        controller_type = controller_config['type']
        implementation = controller_config['implementation']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating {controller_type} controller: {implementation}")
        
        # Create controller based on implementation type
        controller = _create_controller_instance(controller_type, implementation, controller_params)
        if controller:
            device.add_controller(controller_type, controller)
            av_controller = controller  # Keep reference for verification controllers
    
    # Step 2: Create remote controllers (no dependencies)
    for controller_config in remote_controllers:
        controller_type = controller_config['type']
        implementation = controller_config['implementation']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating {controller_type} controller: {implementation}")
        
        controller = _create_controller_instance(controller_type, implementation, controller_params)
        if controller:
            device.add_controller(controller_type, controller)
    
    # Step 3: Create verification controllers (depend on AV controller)
    for controller_config in verification_controllers:
        controller_type = controller_config['type']
        implementation = controller_config['implementation']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating verification controller: {implementation}")
        
        # Add av_controller dependency for verification controllers that need it
        # ADB verification controller doesn't need av_controller (uses direct ADB communication)
        if implementation in ['image', 'text']:
            if av_controller:
                controller_params['av_controller'] = av_controller
            else:
                print(f"[@controller_manager:_create_device_with_controllers] WARNING: {implementation} verification needs AV controller but none available")
        
        # Create the verification controller instance
        controller = _create_controller_instance(
            controller_type, implementation, controller_params
        )
        
        if controller:
            verification_controllers_list.append(controller)
            device.controllers[implementation] = controller
            print(f"[@controller_manager:_create_device_with_controllers] ✓ Created {implementation} verification controller")
        else:
            print(f"[@controller_manager:_create_device_with_controllers] ✗ Failed to create {implementation} verification controller")
    
    # Step 4: Create power controllers (no dependencies)
    for controller_config in power_controllers:
        controller_type = controller_config['type']
        implementation = controller_config['implementation']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating {controller_type} controller: {implementation}")
        
        controller = _create_controller_instance(controller_type, implementation, controller_params)
        if controller:
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