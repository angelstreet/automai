#!/usr/bin/env python3
"""
Example script demonstrating the centralized script utilities.
Usage: python example_script.py [device_id]

This shows how any script can easily:
1. Setup environment and host
2. Select and control devices
3. Clean up properly
"""

import sys
import os

# Add project root to path so we can import src as a package
current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/test_scripts
src_dir = os.path.dirname(current_dir)  # /src
project_root = os.path.dirname(src_dir)  # /virtualpytest

if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import centralized script utilities
from src.utils.script_utils import (
    setup_script_environment,
    select_device,
    take_device_control,
    release_device_control,
    create_host_dict_for_executor
)

def main():
    # 1. Parse arguments
    device_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    print("🚀 Starting example script...")
    
    # 2. Setup script environment (centralized configuration)
    config = setup_script_environment("example")
    if not config['success']:
        print(f"❌ Setup failed: {config['error']}")
        sys.exit(1)
    
    host = config['host']
    team_id = config['team_id']
    
    # 3. Select device (centralized device selection)
    device_result = select_device(host, device_id, "example")
    if not device_result['success']:
        print(f"❌ Device selection failed: {device_result['error']}")
        sys.exit(1)
    
    selected_device = device_result['device']
    
    # 4. Take control of device (centralized device control)
    control_result = take_device_control(host, selected_device, "example")
    if not control_result['success']:
        print(f"❌ Device control failed: {control_result['error']}")
        sys.exit(1)
    
    session_id = control_result['session_id']
    device_key = control_result['device_key']
    
    try:
        # 5. Do your script work here
        print("🎯 [example] Doing script work...")
        
        # Example: Get device capabilities
        capabilities = selected_device.get_capabilities()
        print(f"📋 [example] Device capabilities: {capabilities}")
        
        # Example: Get controllers
        av_controller = selected_device.get_controller('av')
        remote_controller = selected_device.get_controller('remote')
        
        if av_controller:
            print(f"📺 [example] AV controller available: {av_controller.controller_name}")
        
        if remote_controller:
            print(f"🎮 [example] Remote controller available: {remote_controller.controller_name}")
        
        # Example: Create host dict for executor if needed
        host_dict = create_host_dict_for_executor(host)
        print(f"🏠 [example] Host dict created for: {host_dict['host_name']}")
        
        print("✅ [example] Script work completed successfully!")
        
    except Exception as e:
        print(f"❌ [example] Script error: {e}")
        sys.exit(1)
        
    finally:
        # 6. Release control of device (centralized cleanup)
        release_device_control(device_key, session_id, "example")

if __name__ == "__main__":
    main() 