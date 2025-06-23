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
# Same pattern as verifications - defines which action controllers to create per device model
DEVICE_MODEL_ACTION_MAPPING = {
    'android_mobile': ['remote_android_mobile', 'av_hdmi', 'power_usb'],
    'android_tv': ['remote_android_tv', 'av_hdmi', 'power_usb'],
    'ios_mobile': ['remote_appium', 'av_hdmi', 'power_usb'],
    'stb': ['remote_ir', 'av_hdmi', 'power_usb'],
}

def create_controller_configs_from_device_info(device_model, device_ip, device_port, host_url, host_port):
    """
    Create complete controller_configs from basic device registration info.
    
    Args:
        device_model: Device model (e.g., 'android_mobile', 'android_tv')
        device_ip: Device IP address
        device_port: Device port (e.g., '5555' for ADB)
        host_url: Host base URL (e.g., 'https://virtualpytest.com' or 'http://localhost:6109')
        host_port: Host port (for Flask API communication)
    
    Returns:
        dict: Complete controller_configs structure
        
    Raises:
        ValueError: If device_model is not supported
    """
    
    # STEP 1: Validate device model exists in both mappings
    if device_model not in DEVICE_MODEL_VERIFICATION_MAPPING:
        supported_models = list(DEVICE_MODEL_VERIFICATION_MAPPING.keys())
        raise ValueError(f"Unsupported device model '{device_model}'. Supported models: {supported_models}")
    
    if device_model not in DEVICE_MODEL_ACTION_MAPPING:
        supported_models = list(DEVICE_MODEL_ACTION_MAPPING.keys())
        raise ValueError(f"No action mapping for device model '{device_model}'. Supported models: {supported_models}")
    
    print(f"[@controller_config_factory:create_controller_configs] Creating configuration for device model: {device_model}")
    
    # Base configuration - all devices get these
    controller_configs = {}
    
    # STEP 2: Configure action controllers based on device model mapping (same pattern as verifications)
    action_types = DEVICE_MODEL_ACTION_MAPPING[device_model]
    
    if not action_types:
        raise ValueError(f"No action controllers defined for device model '{device_model}'")
    
    print(f"[@controller_config_factory:create_controller_configs] Creating {len(action_types)} action controllers: {action_types}")
    
    for action_type in action_types:
        controller_key = f'action_{action_type}'
        
        if action_type == 'remote_android_mobile':
            controller_configs[controller_key] = {
                'implementation': 'android_mobile',
                'parameters': {
                    'device_ip': device_ip,
                    'device_port': device_port,
                    'connection_timeout': 10
                }
            }
        elif action_type == 'remote_android_tv':
            controller_configs[controller_key] = {
                'implementation': 'android_tv',
                'parameters': {
                    'device_ip': device_ip,
                    'device_port': device_port,
                    'connection_timeout': 10
                }
            }
        elif action_type == 'remote_appium':
            controller_configs[controller_key] = {
                'implementation': 'appium_remote',
                'parameters': {
                    'device_ip': device_ip,
                    'device_port': device_port,
                    'platform_name': 'iOS',
                    'platform_version': '',
                    'appium_url': 'http://localhost:4723',
                    'automation_name': 'XCUITest',
                    'connection_timeout': 10
                }
            }
        elif action_type == 'remote_ir':
            controller_configs[controller_key] = {
                'implementation': 'ir_remote',
                'parameters': {
                    'device_path': '/dev/lirc0',
                    'protocol': 'NEC',
                    'frequency': 38000
                }
            }
        elif action_type == 'av_hdmi':
            controller_configs[controller_key] = {
                'implementation': 'hdmi_stream',
                'parameters': {
                    'video_device': '/dev/video0',
                    'resolution': '1920x1080',
                    'fps': 30,
                    'stream_path': '/stream/video',
                    'service_name': 'stream'
                }
            }
        elif action_type == 'power_usb':
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
                'implementation': action_type,
                'parameters': {}
            }
    
    # STEP 3: Configure verification controllers based on device model mapping
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


def get_device_capabilities_from_model(device_model):
    """
    Get device capabilities based on device model by checking actual controller configs.
    
    Args:
        device_model: Device model string
        
    Returns:
        list: List of actual controller names that exist
    """
    
    # Get the actual controller configs for this device model
    controller_configs = create_controller_configs_from_device_info(
        device_model=device_model,
        device_ip='0.0.0.0',  # Placeholder for capability detection
        device_port='0000',   # Placeholder for capability detection
        host_url='http://localhost:0000',    # Placeholder for capability detection
        host_port='0000'      # Placeholder for capability detection
    )
    
    # Return the actual controller names that exist
    return list(controller_configs.keys())


def get_controller_types_from_model(device_model):
    """
    Get specific controller implementation types supported by device model.
    
    Args:
        device_model: Device model string
        
    Returns:
        list: List of specific implementation type strings (e.g., ['android_mobile', 'hdmi_stream', 'adb', 'usb'])
    """
    
    # Get the actual controller configs for this device model
    controller_configs = create_controller_configs_from_device_info(
        device_model=device_model,
        device_ip='0.0.0.0',  # Placeholder for capability detection
        device_port='0000',   # Placeholder for capability detection
        host_url='http://localhost:0000',    # Placeholder for capability detection
        host_port='0000'      # Placeholder for capability detection
    )
    
    # Extract the specific implementation types from each controller config
    implementation_types = []
    for controller_type, config in controller_configs.items():
        implementation = config.get('implementation')
        if implementation:
            implementation_types.append(implementation)
    
    return implementation_types 