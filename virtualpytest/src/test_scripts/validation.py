#!/usr/bin/env python3
"""
Simple validation script that runs on host and validates all transitions.
Usage: python validation.py <userinterface_name> [device_id]

Examples:
    python validation.py horizon_android_mobile
    python validation.py horizon_android_mobile device1
"""

import sys
import os
import uuid

# Add project root to path so we can import src as a package
current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/test_scripts
src_dir = os.path.dirname(current_dir)  # /src
project_root = os.path.dirname(src_dir)  # /virtualpytest

if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import required modules
from src.controllers.controller_manager import get_host
from src.utils.lock_utils import is_device_locked, lock_device, unlock_device
from src.lib.navigation.navigation_pathfinding import find_optimal_edge_validation_sequence
from src.lib.navigation.navigation_execution import NavigationExecutor
from src.utils.app_utils import get_team_id, load_environment_variables
from src.lib.supabase.userinterface_db import get_userinterface_by_name
from src.lib.supabase.navigation_trees_db import get_root_tree_for_interface

def main():
    # 1. Parse arguments
    if len(sys.argv) < 2:
        print("Usage: python validation.py <userinterface_name> [device_id]")
        print("Examples:")
        print("    python validation.py horizon_android_mobile")
        print("    python validation.py horizon_android_mobile device1")
        sys.exit(1)
    
    userinterface_name = sys.argv[1]
    device_id = sys.argv[2] if len(sys.argv) > 2 else None
    
    print(f"Starting validation for interface: {userinterface_name}")
    
    # 2. Load environment variables (like during host registration)
    print("Loading environment variables...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '..', 'web', '.env.host')
    if os.path.exists(env_path):
        load_environment_variables(mode='host', calling_script_dir=os.path.dirname(env_path))
    else:
        print("⚠️ No .env.host file found, using existing environment")
    
    # 3. Get host instance (creates devices from environment variables)
    print("Creating host instance from environment...")
    try:
        host = get_host()
        print(f"Host created: {host.host_name}")
        print(f"Available devices: {host.get_device_count()}")
        
        # Display available devices
        if host.get_device_count() == 0:
            print("❌ No devices configured in environment variables")
            print("Please configure devices in .env.host file:")
            print("  DEVICE1_NAME=MyDevice")
            print("  DEVICE1_MODEL=horizon_android_mobile")
            print("  DEVICE1_IP=192.168.1.100")
            print("  DEVICE1_PORT=5555")
            sys.exit(1)
        
        for device in host.get_devices():
            print(f"  - {device.device_name} ({device.device_model}) [{device.device_id}]")
            
    except Exception as e:
        print(f"❌ Failed to create host: {e}")
        sys.exit(1)
    
    # 4. Select device
    print("Selecting device...")
    if device_id:
        # Use specified device
        selected_device = None
        for device in host.get_devices():
            if device.device_id == device_id:
                selected_device = device
                break
        
        if not selected_device:
            print(f"❌ Device {device_id} not found")
            available_devices = [d.device_id for d in host.get_devices()]
            print(f"Available devices: {available_devices}")
            sys.exit(1)
    else:
        # Use first available device
        devices = host.get_devices()
        if not devices:
            print("❌ No devices available")
            sys.exit(1)
        selected_device = devices[0]
    
    print(f"Selected device: {selected_device.device_name} ({selected_device.device_id})")
    
    # 5. Check device lock status
    print("Checking device lock status...")
    device_key = f"{host.host_name}:{selected_device.device_id}"
    
    if is_device_locked(device_key):
        print(f"❌ Device {selected_device.device_id} is locked by another process")
        sys.exit(1)
    
    # 6. Take control of device
    print(f"Taking control of device {selected_device.device_id}...")
    session_id = str(uuid.uuid4())
    
    if not lock_device(device_key, session_id):
        print(f"❌ Failed to take control of device {selected_device.device_id}")
        sys.exit(1)
    
    print(f"✅ Successfully took control of device {selected_device.device_id}")
    
    try:
        # 7. Get tree_id from userinterface_name
        print("Getting tree ID from userinterface name...")
        team_id = get_team_id()
        
        # First, get the userinterface by name
        userinterface = get_userinterface_by_name(userinterface_name, team_id)
        if not userinterface:
            print(f"❌ User interface '{userinterface_name}' not found")
            sys.exit(1)
        
        userinterface_id = userinterface['id']
        
        # Get the root tree for this interface
        root_tree = get_root_tree_for_interface(userinterface_id, team_id)
        if not root_tree:
            print(f"❌ No root tree found for interface '{userinterface_name}'")
            sys.exit(1)
        
        tree_id = root_tree['id']
        print(f"Found tree ID: {tree_id}")
        
        # 8. Get validation sequence
        print("Getting validation sequence...")
        validation_sequence = find_optimal_edge_validation_sequence(tree_id, team_id)
        
        if not validation_sequence:
            print("❌ No validation sequence found")
            sys.exit(1)
        
        print(f"Found {len(validation_sequence)} validation steps")
        
        # 9. Execute validation using NavigationExecutor
        print("Initializing navigation executor...")
        
        # Create host dictionary for NavigationExecutor (matching the expected format)
        host_dict = {
            'host_name': host.host_name,
            'host_url': getattr(host, 'host_url', f"http://{host.host_ip}:{host.host_port}"),
            'host_ip': host.host_ip,
            'host_port': host.host_port,
            'devices': [device.to_dict() for device in host.get_devices()]
        }
        
        executor = NavigationExecutor(host_dict, session_id)
        
        print(f"Starting validation on device {selected_device.device_id}")
        
        for i, step in enumerate(validation_sequence, 1):
            print(f"Executing step {i}/{len(validation_sequence)}: {step.get('description', 'Unknown step')}")
            
            # Execute navigation to target node for this validation step
            result = executor.execute_navigation(
                tree_id=tree_id,
                target_node_id=step.get('to_node_id'),
                current_node_id=step.get('from_node_id')
            )
            
            if not result.get('success'):
                print(f"❌ Validation failed at step {i}: {result.get('error', 'Unknown error')}")
                sys.exit(1)
            
            print(f"✅ Step {i} completed successfully")
        
        print("🎉 All validation steps completed successfully!")
        
    except Exception as e:
        print(f"❌ Validation error: {e}")
        sys.exit(1)
        
    finally:
        # 10. Release control of device
        print(f"Releasing control of device {selected_device.device_id}...")
        unlock_device(device_key, session_id)
        print("✅ Device control released")

if __name__ == "__main__":
    main() 