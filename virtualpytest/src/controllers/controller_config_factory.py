"""
Controller Configuration Factory

Simple hardcoded device-to-controller mapping.
Each device model has predefined controllers and verification capabilities.
"""

# Device Model → Controllers Mapping
DEVICE_CONTROLLER_MAP = {
    'android_mobile': {
        'av': ['hdmi_stream'], 
        'remote': ['android_mobile'],
        'power': [],
        'network': [],
        'ai': ['ai_agent']
    },
    'android_tv': {
        'av': ['hdmi_stream'], 
        'remote': ['android_tv'],
        'power': [],
        'network': [],
        'ai': ['ai_agent']
    },
    'ios_mobile': {
        'av': ['hdmi_stream'], 
        'remote': ['appium'],
        'power': [],
        'network': [],
        'ai': ['ai_agent']
    },
    'stb': {
        'av': ['hdmi_stream'], 
        'remote': [],
        'power': [],
        'network': [],
        'ai': ['ai_agent']
    }
}

# Controller → Verification Capabilities
CONTROLLER_VERIFICATION_MAP = {
    'hdmi_stream': ['image', 'text', 'video'],
    'android_mobile': ['adb'],
    'android_tv': [],  # No verification for android_tv remote
    'appium': ['appium'],
    'ai_agent': ['task_execution']
}

def create_controller_configs_from_device_info(device_config: dict) -> dict:
    """Create controller configurations for a device."""
    device_model = device_config.get('model', device_config.get('device_model'))
    
    print(f"[@controller_factory:create_controller_configs_from_device_info] DEBUG: Received device_config:")
    for key, value in device_config.items():
        print(f"[@controller_factory:create_controller_configs_from_device_info] DEBUG:   {key} = {value}")
    
    print(f"[@controller_factory:create_controller_configs_from_device_info] Creating configs for device model: {device_model}")
    
    if device_model not in DEVICE_CONTROLLER_MAP:
        print(f"[@controller_factory:create_controller_configs_from_device_info] ERROR: Unknown device model: {device_model}")
        print(f"[@controller_factory:create_controller_configs_from_device_info] ERROR: Available models: {list(DEVICE_CONTROLLER_MAP.keys())}")
        return {}
    
    configs = {}
    device_mapping = DEVICE_CONTROLLER_MAP[device_model]
    
    # Create AV controllers
    for av_impl in device_mapping['av']:
        configs['av'] = {
            'type': 'av',
            'implementation': av_impl,
            'params': _get_av_params(av_impl, device_config)
        }
        print(f"[@controller_factory:create_controller_configs_from_device_info] Created AV controller: {av_impl}")
    
    # Create Remote controllers
    for remote_impl in device_mapping['remote']:
        configs['remote'] = {
            'type': 'remote',
            'implementation': remote_impl,
            'params': _get_remote_params(remote_impl, device_config)
        }
        print(f"[@controller_factory:create_controller_configs_from_device_info] Created Remote controller: {remote_impl}")
    
    # Create AI controllers
    for ai_impl in device_mapping['ai']:
        configs['ai'] = {
            'type': 'ai',
            'implementation': ai_impl,
            'params': {'device_id': device_config.get('device_id')}  # Add device_id to params
        }
        print(f"[@controller_factory:create_controller_configs_from_device_info] Created AI controller: {ai_impl}")
    
    # Create Verification controllers (NEW!)
    verification_types = []
    for controller_list in device_mapping.values():
        for controller_impl in controller_list:
            verification_types.extend(CONTROLLER_VERIFICATION_MAP.get(controller_impl, []))
    
    # Remove duplicates and create verification controller configs
    for verification_impl in set(verification_types):
        configs[f'verification_{verification_impl}'] = {
            'type': 'verification',
            'implementation': verification_impl,
            'params': _get_verification_params(verification_impl, device_config)
        }
        print(f"[@controller_factory:create_controller_configs_from_device_info] Created Verification controller: {verification_impl}")
    
    print(f"[@controller_factory:create_controller_configs_from_device_info] Created {len(configs)} controller configs")
    return configs

def get_device_capabilities(device_model: str) -> dict:
    """Get detailed capabilities for a device model."""
    if device_model not in DEVICE_CONTROLLER_MAP:
        return {
            'av': None,
            'remote': None,
            'verification': []
        }
    
    mapping = DEVICE_CONTROLLER_MAP[device_model]
    
    # Get verification types from all controllers
    verification_types = []
    for controller_list in mapping.values():
        for controller_impl in controller_list:
            verification_types.extend(CONTROLLER_VERIFICATION_MAP.get(controller_impl, []))
    
    capabilities = {
        'av': mapping['av'][0] if mapping['av'] else None,
        'remote': mapping['remote'][0] if mapping['remote'] else None,
        'ai': mapping['ai'][0] if mapping['ai'] else None,
        'verification': list(set(verification_types))  # Remove duplicates
    }
    
    print(f"[@controller_factory:get_device_capabilities] Device {device_model} capabilities: {capabilities}")
    return capabilities

def _get_av_params(implementation: str, device_config: dict) -> dict:
    """Get parameters for AV controllers."""
    if implementation == 'hdmi_stream':
        return {
            'video_stream_path': device_config.get('video_stream_path', '/host/stream/capture1'),
            'video_capture_path': device_config.get('video_capture_path', '/var/www/html/stream/capture1')
        }
    return {}

def _get_remote_params(implementation: str, device_config: dict) -> dict:
    """Get parameters for Remote controllers."""
    print(f"[@controller_factory:_get_remote_params] DEBUG: Getting remote params for implementation: {implementation}")
    
    if implementation in ['android_mobile', 'android_tv']:
        params = {
            'device_ip': device_config.get('device_ip', '192.168.1.100'),
            'device_port': device_config.get('device_port', 5555)
        }
        print(f"[@controller_factory:_get_remote_params] DEBUG: Android params: {params}")
        return params
    elif implementation == 'appium':
        params = {
            'appium_platform_name': device_config.get('appium_platform_name'),
            'appium_device_id': device_config.get('appium_device_id'),
            'appium_server_url': device_config.get('appium_server_url', 'http://localhost:4723')
        }
        print(f"[@controller_factory:_get_remote_params] DEBUG: Appium params: {params}")
        print(f"[@controller_factory:_get_remote_params] DEBUG: Key Appium values:")
        print(f"[@controller_factory:_get_remote_params] DEBUG:   platform_name = {params['appium_platform_name']}")
        print(f"[@controller_factory:_get_remote_params] DEBUG:   device_id = {params['appium_device_id']}")
        print(f"[@controller_factory:_get_remote_params] DEBUG:   server_url = {params['appium_server_url']}")
        return params
    
    print(f"[@controller_factory:_get_remote_params] DEBUG: Unknown implementation, returning empty params")
    return {}

def _get_verification_params(implementation: str, device_config: dict) -> dict:
    """Get parameters for Verification controllers."""
    if implementation in ['image', 'text', 'video']:
        # Image, text, and video verification controllers need av_controller dependency
        # This will be injected by the controller manager
        return {}
    elif implementation == 'adb':
        # ADB verification controller needs device connection info
        return {
            'device_ip': device_config.get('device_ip', '192.168.1.100'),
            'device_port': device_config.get('device_port', 5555)
        }
    elif implementation == 'appium':
        # Appium verification controller needs Appium server info
        return {
            'appium_platform_name': device_config.get('appium_platform_name'),
            'appium_device_id': device_config.get('appium_device_id'),
            'appium_server_url': device_config.get('appium_server_url', 'http://localhost:4723')
        }
    elif implementation == 'task_execution':
        # AI agent verification capabilities
        return {}
    return {}

