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

from src.utils.host_utils import list_available_devices
from src.utils.lock_utils import is_device_locked, lock_device, unlock_device
from src.lib.navigation.navigation_pathfinding import find_optimal_edge_validation_sequence
from src.lib.navigation.navigation_execution import NavigationExecutor
from src.utils.app_utils import get_team_id
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
    if device_id:
        print(f"Target device: {device_id}")
    
    # 2. Get available devices on current host
    print("Getting available devices...")
    available_devices = list_available_devices()
    
    if not available_devices:
        print("No devices available on this host")
        sys.exit(1)
    
    print(f"Found {len(available_devices)} devices:")
    for device in available_devices:
        locked_status = "LOCKED" if is_device_locked(device['device_id']) else "AVAILABLE"
        print(f"  - {device['device_id']}: {device['name']} ({device['model']}) [{locked_status}]")
    
    # 3. Select device (provided or first available unlocked)
    selected_device = None
    
    if device_id:
        # Check if provided device exists and is available
        if not any(d['device_id'] == device_id for d in available_devices):
            print(f"Device {device_id} not found")
            sys.exit(1)
        if is_device_locked(device_id):
            print(f"Device {device_id} is locked")
            sys.exit(1)
        selected_device = device_id
    else:
        # Find first available unlocked device
        for device in available_devices:
            if not is_device_locked(device['device_id']):
                selected_device = device['device_id']
                break
        
        if not selected_device:
            print("No available devices")
            sys.exit(1)
    
    print(f"Selected device: {selected_device}")
    
    # 4. Take control of device
    print("Taking control of device...")
    session_id = str(uuid.uuid4())
    
    if not lock_device(selected_device, session_id):
        print("Take control failed")
        sys.exit(1)
    
    print(f"Successfully took control (session: {session_id})")
    
    try:
        # 5. Get tree_id from userinterface_name
        print("Getting tree ID from userinterface name...")
        team_id = get_team_id()
        
        # First, get the userinterface by name
        userinterface = get_userinterface_by_name(userinterface_name, team_id)
        if not userinterface:
            print(f"User interface '{userinterface_name}' not found")
            sys.exit(1)
        
        userinterface_id = userinterface['id']
        
        # Get the root tree for this interface
        root_tree = get_root_tree_for_interface(userinterface_id, team_id)
        if not root_tree:
            print(f"No root tree found for interface '{userinterface_name}'")
            sys.exit(1)
        
        tree_id = root_tree['id']
        print(f"Found tree ID: {tree_id} for interface: {userinterface_name}")
        
        # Get validation sequence
        print("Getting validation sequence...")
        validation_sequence = find_optimal_edge_validation_sequence(tree_id, team_id)
        
        if not validation_sequence:
            print("No validation sequence found for this interface")
            sys.exit(1)
        
        print(f"Found validation sequence with {len(validation_sequence)} steps")
        
        # 6. Execute validation using NavigationExecutor
        print("Initializing navigation executor...")
        
        # Create minimal host configuration for script execution
        host = {
            "host_name": "script_host",
            "device_model": "script_device"
        }
        
        executor = NavigationExecutor(host, selected_device, team_id)
        
        print(f"Starting validation on device {selected_device}")
        
        for i, step in enumerate(validation_sequence, 1):
            print(f"Executing step {i}/{len(validation_sequence)}: {step.get('description', 'Unknown step')}")
            
            # Execute navigation to target node for this validation step
            result = executor.execute_navigation(
                tree_id=tree_id,
                target_node_id=step.get('to_node_id'),
                current_node_id=step.get('from_node_id')
            )
            
            if not result.get('success'):
                print(f"Validation failed at step {i}: {result.get('error', 'Unknown error')}")
                sys.exit(1)
            
            print(f"Step {i} completed successfully")
        
        print("✅ Validation completed successfully!")
        
    except Exception as e:
        print(f"❌ Validation error: {str(e)}")
        sys.exit(1)
        
    finally:
        # 7. Release control
        print("Releasing device control...")
        unlock_device(selected_device, session_id)
        print("Device control released")

if __name__ == "__main__":
    main() 