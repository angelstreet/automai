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

# Add project root to path so we can import src as a package
current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/test_scripts
src_dir = os.path.dirname(current_dir)  # /src
project_root = os.path.dirname(src_dir)  # /virtualpytest

if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import required modules
from src.utils.script_utils import (
    setup_script_environment,
    select_device,
    take_device_control,
    release_device_control,
    create_host_dict_for_executor
)
from src.lib.navigation.navigation_pathfinding import find_optimal_edge_validation_sequence
from src.lib.navigation.navigation_execution import NavigationExecutor
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
    
    print(f"🚀 Starting validation for interface: {userinterface_name}")
    
    # 2. Setup script environment (centralized configuration)
    config = setup_script_environment("validation")
    if not config['success']:
        print(f"❌ Setup failed: {config['error']}")
        sys.exit(1)
    
    host = config['host']
    team_id = config['team_id']
    
    # 3. Select device (centralized device selection)
    device_result = select_device(host, device_id, "validation")
    if not device_result['success']:
        print(f"❌ Device selection failed: {device_result['error']}")
        sys.exit(1)
    
    selected_device = device_result['device']
    
    # 4. Take control of device (centralized device control)
    control_result = take_device_control(host, selected_device, "validation")
    if not control_result['success']:
        print(f"❌ Device control failed: {control_result['error']}")
        sys.exit(1)
    
    session_id = control_result['session_id']
    device_key = control_result['device_key']
    
    try:
        # 5. Get tree_id from userinterface_name
        print("🔍 [validation] Getting tree ID from userinterface name...")
        
        # First, get the userinterface by name
        userinterface = get_userinterface_by_name(userinterface_name, team_id)
        if not userinterface:
            print(f"❌ [validation] User interface '{userinterface_name}' not found")
            sys.exit(1)
        
        userinterface_id = userinterface['id']
        
        # Get the root tree for this interface
        root_tree = get_root_tree_for_interface(userinterface_id, team_id)
        if not root_tree:
            print(f"❌ [validation] No root tree found for interface '{userinterface_name}'")
            sys.exit(1)
        
        tree_id = root_tree['id']
        print(f"✅ [validation] Found tree ID: {tree_id}")
        
        # 6. Get validation sequence
        print("📋 [validation] Getting validation sequence...")
        validation_sequence = find_optimal_edge_validation_sequence(tree_id, team_id)
        
        if not validation_sequence:
            print("❌ [validation] No validation sequence found")
            sys.exit(1)
        
        print(f"✅ [validation] Found {len(validation_sequence)} validation steps")
        
        # 7. Execute validation using NavigationExecutor
        print("🎯 [validation] Initializing navigation executor...")
        
        # Create host dictionary for NavigationExecutor (centralized)
        host_dict = create_host_dict_for_executor(host)
        executor = NavigationExecutor(host_dict, session_id)
        
        print(f"🎮 [validation] Starting validation on device {selected_device.device_id}")
        
        for i, step in enumerate(validation_sequence, 1):
            print(f"⚡ [validation] Executing step {i}/{len(validation_sequence)}: {step.get('description', 'Unknown step')}")
            
            # Execute navigation to target node for this validation step
            result = executor.execute_navigation(
                tree_id=tree_id,
                target_node_id=step.get('to_node_id'),
                current_node_id=step.get('from_node_id')
            )
            
            if not result.get('success'):
                print(f"❌ [validation] Validation failed at step {i}: {result.get('error', 'Unknown error')}")
                sys.exit(1)
            
            print(f"✅ [validation] Step {i} completed successfully")
        
        print("🎉 [validation] All validation steps completed successfully!")
        
    except Exception as e:
        print(f"❌ [validation] Validation error: {e}")
        sys.exit(1)
        
    finally:
        # 8. Release control of device (centralized cleanup)
        release_device_control(device_key, session_id, "validation")

if __name__ == "__main__":
    main() 