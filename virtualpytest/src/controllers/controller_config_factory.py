"""
Controller Configuration Factory

This module creates complete controller configurations from basic device registration information.
All communication is via direct device connections (ADB, uhubctl, etc.).
"""

# Device Model to Verification Controllers Mapping
# This matches the mapping in Controller_Types.ts
DEVICE_MODEL_VERIFICATION_MAPPING = {
    'android_mobile': ['image', 'text', 'adb'],
    'android_tv': ['image', 'text'],
    'ios_mobile': ['image', 'text', 'appium'],
    'stb': ['image', 'audio', 'text', 'video'],
}

# Device Model to Action Controllers Mapping
# Same pattern as verifications - defines which action implementations to create per device model
DEVICE_MODEL_ACTION_MAPPING = {
    'android_mobile': ['android_mobile', 'hdmi_stream'],
    'android_tv': ['android_tv', 'hdmi_stream'],
    'ios_mobile': ['appium_remote', 'hdmi_stream'],
    'stb': ['hdmi_stream'],
}

def create_controller_configs_from_device_info(device_model, device_ip, device_port, host_url, host_port, device_config=None):
    """
    Create complete controller_configs from basic device registration info.
    
    Args:
        device_model: Device model (e.g., 'android_mobile', 'android_tv')
        device_ip: Device IP address
        device_port: Device port (e.g., '5555' for ADB)
        host_url: Host base URL (e.g., 'https://virtualpytest.com' or 'http://localhost:6109')
        host_port: Host port (for Flask API communication)
        device_config: Device configuration with device_id and paths (REQUIRED)
    
    Returns:
        dict: Complete controller_configs structure
        
    Raises:
        ValueError: If device_model is not supported or device_config is missing
    """
    
    # STEP 1: Validate required parameters
    if not device_config:
        raise ValueError("device_config is required for multi-device support")
    
    device_id = device_config.get('device_id')
    if not device_id:
        raise ValueError("device_id is required in device_config")
    
    # STEP 2: Validate device model exists in both mappings
    if device_model not in DEVICE_MODEL_VERIFICATION_MAPPING:
        supported_models = list(DEVICE_MODEL_VERIFICATION_MAPPING.keys())
        raise ValueError(f"Unsupported device model '{device_model}'. Supported models: {supported_models}")
    
    if device_model not in DEVICE_MODEL_ACTION_MAPPING:
        supported_models = list(DEVICE_MODEL_ACTION_MAPPING.keys())
        raise ValueError(f"No action mapping for device model '{device_model}'. Supported models: {supported_models}")
    
    print(f"[@controller_config_factory:create_controller_configs] Creating configuration for device model: {device_model}, device_id: {device_id}")
    
    # Base configuration - all devices get these
    controller_configs = {}
    
    # STEP 3: Configure action controllers based on device model mapping (same pattern as verifications)
    action_implementations = DEVICE_MODEL_ACTION_MAPPING[device_model]
    
    if not action_implementations:
        raise ValueError(f"No action controllers defined for device model '{device_model}'")
    
    print(f"[@controller_config_factory:create_controller_configs] Creating {len(action_implementations)} action controllers: {action_implementations}")
    
    for implementation in action_implementations:
        # Map implementation to capability type
        if implementation in ['android_mobile', 'android_tv', 'appium_remote', 'ir_remote']:
            controller_key = f'remote_{implementation}'
        elif implementation in ['hdmi_stream']:
            controller_key = f'av_{implementation}'
        elif implementation in ['usb']:
            controller_key = f'power_{implementation}'
        else:
            controller_key = f'action_{implementation}'  # Fallback
        
        if implementation == 'android_mobile':
            controller_configs[controller_key] = {
                'implementation': 'android_mobile',
                'parameters': {
                    'device_ip': device_ip,
                    'device_port': device_port,
                    'connection_timeout': 10,
                    'device_id': device_id,
                    'device_config': device_config
                }
            }
        elif implementation == 'android_tv':
            controller_configs[controller_key] = {
                'implementation': 'android_tv',
                'parameters': {
                    'device_ip': device_ip,
                    'device_port': device_port,
                    'connection_timeout': 10,
                    'device_id': device_id,
                    'device_config': device_config
                }
            }
        elif implementation == 'appium_remote':
            controller_configs[controller_key] = {
                'implementation': 'appium_remote',
                'parameters': {
                    'device_ip': device_ip,
                    'device_port': device_port,
                    'platform_name': 'iOS',
                    'platform_version': '',
                    'appium_url': 'http://localhost:4723',
                    'automation_name': 'XCUITest',
                    'connection_timeout': 10,
                    'device_id': device_id,
                    'device_config': device_config
                }
            }
        elif implementation == 'ir_remote':
            controller_configs[controller_key] = {
                'implementation': 'ir_remote',
                'parameters': {
                    'device_path': '/dev/lirc0',
                    'protocol': 'NEC',
                    'frequency': 38000,
                    'device_id': device_id,
                    'device_config': device_config
                }
            }
        elif implementation == 'hdmi_stream':
            # Use device-specific video configuration if available
            video_device = '/dev/video0'
            stream_path = '/stream/video'
            capture_path = None
            device_id = None
            
            if device_config:
                video_device = device_config.get('video_device', video_device)
                stream_path = device_config.get('video_stream_path', stream_path)
                capture_path = device_config.get('video_capture_path')
                device_id = device_config.get('device_id')
            
            controller_configs[controller_key] = {
                'implementation': 'hdmi_stream',
                'parameters': {
                    'video_device': video_device,
                    'resolution': '1920x1080',
                    'fps': 30,
                    'stream_path': stream_path,
                    'capture_path': capture_path,
                    'service_name': 'stream',
                    'device_id': device_id,
                    'device_config': device_config
                }
            }
        elif implementation == 'usb':
            controller_configs[controller_key] = {
                'implementation': 'usb',
                'parameters': {
                    'hub_location': '1-1',
                    'port_number': 1
                }
            }
        else:
            # Other action types with default parameters
            controller_configs[controller_key] = {
                'implementation': implementation,
                'parameters': {}
            }
    
    # STEP 4: Configure verification controllers based on device model mapping
    verification_types = DEVICE_MODEL_VERIFICATION_MAPPING[device_model]  # No fallback - must exist
    
    if not verification_types:
        raise ValueError(f"No verification controllers defined for device model '{device_model}'")
    
    print(f"[@controller_config_factory:create_controller_configs] Creating {len(verification_types)} verification controllers: {verification_types}")
    
    for verification_type in verification_types:
        controller_key = f'verification_{verification_type}'
        
        if verification_type == 'adb':
            # ADB verification needs device connection parameters
            controller_configs[controller_key] = {
                'implementation': 'adb',
                'parameters': {
                    'device_ip': device_ip,
                    'device_port': device_port,
                    'connection_timeout': 10
                }
            }
        elif verification_type == 'appium':
            # Appium verification needs device connection parameters
            controller_configs[controller_key] = {
                'implementation': 'appium',
                'parameters': {
                    'device_ip': device_ip,  # Use IP for network connection
                    'device_port': device_port,  # iOS network debugging port
                    'platform_name': 'iOS' if device_model.startswith('ios_') else 'Android',
                    'appium_url': 'http://localhost:4723',
                    'automation_name': 'XCUITest' if device_model.startswith('ios_') else 'UIAutomator2',
                    'connection_timeout': 10
                }
            }
        else:
            # Other verification types (image, audio, text, video) work with AV controller
            controller_configs[controller_key] = {
                'implementation': verification_type,
                'parameters': {}
            }
    
    print(f"[@controller_config_factory:create_controller_configs] Successfully created configuration with {len(controller_configs)} controllers")
    return controller_configs

# Note: Capability detection functions removed - server now uses capabilities sent by host directly 