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
from ..controllers.audiovideo.vnc_stream import VNCStreamController
from ..controllers.audiovideo.camera_stream import CameraStreamController
from ..controllers.remote.android_mobile import AndroidMobileRemoteController
from ..controllers.remote.android_tv import AndroidTVRemoteController
from ..controllers.remote.appium_remote import AppiumRemoteController
from ..controllers.desktop.bash import BashDesktopController
from ..controllers.desktop.pyautogui import PyAutoGUIDesktopController
from ..controllers.verification.image import ImageVerificationController
from ..controllers.verification.text import TextVerificationController
from ..controllers.verification.adb import ADBVerificationController
from ..controllers.verification.appium import AppiumVerificationController
from ..controllers.verification.video import VideoVerificationController
from ..controllers.power.tapo_power import TapoPowerController
# from ..controllers.ai.ai_agent import AIAgentController  # Lazy import to avoid circular import


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
    
    # Check for host VNC configuration and create VNC controller if present
    vnc_stream_path = os.getenv('HOST_VNC_STREAM_PATH')
    video_capture_path = os.getenv('HOST_VIDEO_CAPTURE_PATH')
    
    if vnc_stream_path and video_capture_path:
        print(f"[@controller_manager:create_host_from_environment] VNC configuration detected - creating host VNC controller")
        print(f"[@controller_manager:create_host_from_environment]   VNC Stream Path: {vnc_stream_path}")
        print(f"[@controller_manager:create_host_from_environment]   Video Capture Path: {video_capture_path}")
        
        # Add password to VNC stream path if available
        vnc_password = os.getenv('HOST_VNC_PASSWORD')
        final_vnc_stream_path = vnc_stream_path
        if vnc_password:
            separator = '&' if '?' in vnc_stream_path else '?'
            final_vnc_stream_path = f"{vnc_stream_path}{separator}password={vnc_password}"
            print(f"[@controller_manager:create_host_from_environment]   VNC Password: Added to stream path")
        
        # Create host VNC device (special device representing the host itself)
        host_device_config = {
            'device_id': 'host',
            'device_name': f'{host_name}_Host',
            'device_model': 'host_vnc',  # Keep the model as host_vnc for controller configuration
            'video_stream_path': final_vnc_stream_path,
            'video_capture_path': video_capture_path,
            'host_ip': host_ip,  # Add host IP for web controller
            'host_port': host_port  # Add host port for web controller
        }
        
        host_device = _create_device_with_controllers(host_device_config)
        host.add_device(host_device)
        print(f"[@controller_manager:create_host_from_environment] Added host VNC device: {host_device.device_id} ({host_device.device_name})")
    
    # Create devices from environment variables
    devices_config = _get_devices_config_from_environment()
    
    for device_config in devices_config:
        device = _create_device_with_controllers(device_config)
        host.add_device(device)
        print(f"[@controller_manager:create_host_from_environment] Added device: {device.device_id} ({device.device_name})")
    
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
            power_name = os.getenv(f'DEVICE{i}_POWER_NAME')
            power_ip = os.getenv(f'DEVICE{i}_POWER_IP')
            power_email = os.getenv(f'DEVICE{i}_POWER_EMAIL')
            power_pwd = os.getenv(f'DEVICE{i}_POWER_PWD')
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
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_POWER_NAME = {power_name}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_POWER_IP = {power_ip}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_POWER_EMAIL = {power_email}")
            print(f"[@controller_manager:_get_devices_config_from_environment] DEBUG: DEVICE{i}_POWER_PWD = {'***' if power_pwd else None}")
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
                # Power configuration
                'power_name': power_name,
                'power_ip': power_ip,
                'power_email': power_email,
                'power_pwd': power_pwd,
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
        controller_type: Abstract type ('av', 'remote', 'verification', 'ai', etc.)
        implementation: Specific implementation ('hdmi_stream', 'android_mobile', 'ai_agent', etc.)
        params: Constructor parameters
        
    Returns:
        Controller instance or None if not found
    """
    # AV Controllers
    if controller_type == 'av':
        if implementation == 'hdmi_stream':
            return HDMIStreamController(**params)
        elif implementation == 'vnc_stream':
            return VNCStreamController(**params)
        elif implementation == 'camera_stream':
            return CameraStreamController(**params)
    
    # Remote Controllers
    elif controller_type == 'remote':
        if implementation == 'android_mobile':
            return AndroidMobileRemoteController(**params)
        elif implementation == 'android_tv':
            return AndroidTVRemoteController(**params)
        elif implementation == 'appium':
            return AppiumRemoteController(**params)
    
    # AI Controllers
    elif controller_type == 'ai':
        if implementation == 'ai_agent':
            # Lazy import to avoid circular import
            from ..controllers.ai.ai_agent import AIAgentController
            # Pass device_name explicitly from params
            device_name = params.get('device_id')
            return AIAgentController(device_name=device_name, **params)
    
    # Verification Controllers - now require device_model
    elif controller_type == 'verification':
        if implementation == 'image':
            return ImageVerificationController(**params)
        elif implementation == 'text':
            return TextVerificationController(**params)
        elif implementation == 'video':
            return VideoVerificationController(**params)
        elif implementation == 'adb':
            return ADBVerificationController(**params)
        elif implementation == 'appium':
            return AppiumVerificationController(**params)
    
    # Desktop Controllers
    elif controller_type == 'desktop':
        if implementation == 'bash':
            return BashDesktopController(**params)
        elif implementation == 'pyautogui':
            return PyAutoGUIDesktopController(**params)
    
    # Web Controllers
    elif controller_type == 'web':
        if implementation == 'playwright':
            from ..controllers.web.playwright import PlaywrightWebController
            return PlaywrightWebController(**params)
    
    # Power Controllers
    elif controller_type == 'power':
        if implementation == 'tapo':
            return TapoPowerController(**params)
    
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
    device_name = device_config['device_name']
    device_model = device_config['device_model']
    
    print(f"[@controller_manager:_create_device_with_controllers] Creating device: {device_id}")
    
    # Create device with IP/port values and video paths for URL building
    device = Device(
        device_id, 
        device_name, 
        device_model,
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
    ai_controllers = [c for c in controller_list if c['type'] == 'ai']
    verification_controllers = [c for c in controller_list if c['type'] == 'verification']
    power_controllers = [c for c in controller_list if c['type'] == 'power']
    desktop_controllers = [c for c in controller_list if c['type'] == 'desktop']
    web_controllers = [c for c in controller_list if c['type'] == 'web']
    
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
    
    # Step 3: Create AI controllers (no dependencies)
    for controller_config in ai_controllers:
        controller_type = controller_config['type']
        implementation = controller_config['implementation']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating {controller_type} controller: {implementation}")
        
        controller = _create_controller_instance(controller_type, implementation, controller_params)
        if controller:
            device.add_controller(controller_type, controller)
    
    # Step 4: Create verification controllers (depend on AV controller and device model)
    for controller_config in verification_controllers:
        controller_type = controller_config['type']
        implementation = controller_config['implementation']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating verification controller: {implementation}")
        
        # Add av_controller dependency for verification controllers that need it
        # ADB verification controller doesn't need av_controller (uses direct ADB communication)
        if implementation in ['image', 'text', 'video', 'audio']:
            if av_controller:
                controller_params['av_controller'] = av_controller
            else:
                print(f"[@controller_manager:_create_device_with_controllers] WARNING: {implementation} verification needs AV controller but none available")
                continue  # Skip creating this controller
        
        # Create the verification controller instance
        controller = _create_controller_instance(
            controller_type, implementation, controller_params
        )
        
        if controller:
            device.add_controller(controller_type, controller)
            print(f"[@controller_manager:_create_device_with_controllers] ✓ Created {implementation} verification controller")
        else:
            print(f"[@controller_manager:_create_device_with_controllers] ✗ Failed to create {implementation} verification controller")
    
    # Step 5: Create power controllers (no dependencies)
    for controller_config in power_controllers:
        controller_type = controller_config['type']
        implementation = controller_config['implementation']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating {controller_type} controller: {implementation}")
        
        controller = _create_controller_instance(controller_type, implementation, controller_params)
        if controller:
            device.add_controller(controller_type, controller)
    
    # Step 6: Create desktop controllers (no dependencies)
    for controller_config in desktop_controllers:
        controller_type = controller_config['type']
        implementation = controller_config['implementation']
        controller_params = controller_config['params']
        
        print(f"[@controller_manager:_create_device_with_controllers] Creating {controller_type} controller: {implementation}")
        
        controller = _create_controller_instance(controller_type, implementation, controller_params)
        if controller:
            device.add_controller(controller_type, controller)
    
    # Step 7: Create web controllers (no dependencies)
    for controller_config in web_controllers:
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