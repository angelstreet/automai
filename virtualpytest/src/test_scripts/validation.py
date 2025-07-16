#!/usr/bin/env python3
"""
Validation Script for VirtualPyTest

This script validates all transitions in a navigation tree by:
1. Taking control of a device
2. Loading the navigation tree
3. Finding validation sequence
4. Executing each validation step directly using host controllers
5. Releasing device control

Usage:
    python -m src.test_scripts.validation <userinterface_name> [--host <host>] [--device <device>]
    
Example:
    python -m src.test_scripts.validation horizon_android_mobile
    python -m src.test_scripts.validation horizon_android_mobile --device device2
"""

import sys
import argparse
from typing import Dict, Any, Optional

# Add project root to path for imports
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(src_dir)

if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import utilities
from src.utils.script_utils import (
    setup_script_environment,
    select_device,
    take_device_control,
    release_device_control,
    load_navigation_tree,
    execute_navigation_step_directly,
    execute_verification_directly
)

# Import pathfinding for validation sequence
from src.lib.navigation.navigation_pathfinding import find_optimal_edge_validation_sequence


def main():
    """Main validation function"""
    parser = argparse.ArgumentParser(description='Validate navigation tree transitions')
    parser.add_argument('userinterface_name', help='Name of the userinterface to validate (e.g., horizon_android_mobile)')
    parser.add_argument('--host', help='Specific host to use (optional)')
    parser.add_argument('--device', help='Specific device to use (optional)')
    
    args = parser.parse_args()
    
    userinterface_name = args.userinterface_name
    host_name = args.host
    device_id = args.device
    
    print(f"🎯 [validation] Starting validation for: {userinterface_name}")
    
    try:
        # 1. Setup script environment (centralized)
        setup_result = setup_script_environment("validation")
        if not setup_result['success']:
            print(f"❌ [validation] Setup failed: {setup_result['error']}")
            sys.exit(1)
        
        host = setup_result['host']
        team_id = setup_result['team_id']
        
        # 2. Select device (centralized)
        device_result = select_device(host, device_id, "validation")
        if not device_result['success']:
            print(f"❌ [validation] Device selection failed: {device_result['error']}")
            sys.exit(1)
        
        selected_device = device_result['device']
        
        # 3. Take device control (centralized)
        control_result = take_device_control(host, selected_device, "validation")
        if not control_result['success']:
            print(f"❌ [validation] Failed to take device control: {control_result['error']}")
            sys.exit(1)
        
        session_id = control_result['session_id']
        device_key = control_result['device_key']
        
        # 4. Load navigation tree (centralized function)
        tree_result = load_navigation_tree(userinterface_name, "validation")
        if not tree_result['success']:
            print(f"❌ [validation] Tree loading failed: {tree_result['error']}")
            sys.exit(1)
        
        tree_data = tree_result['tree']
        tree_id = tree_result['tree_id']
        
        # 5. Get validation sequence (use userinterface_name directly like web does)
        print("📋 [validation] Getting validation sequence...")
        validation_sequence = find_optimal_edge_validation_sequence(userinterface_name, team_id)
        
        if not validation_sequence:
            print("❌ [validation] No validation sequence found")
            sys.exit(1)
        
        print(f"✅ [validation] Found {len(validation_sequence)} validation steps")
        
        # 6. Execute validation steps directly using host controllers
        print("🎮 [validation] Starting validation on device", selected_device.device_id)
        
        current_node = None
        for i, step in enumerate(validation_sequence):
            step_num = i + 1
            from_node = step.get('from_node_label', 'unknown')
            to_node = step.get('to_node_label', 'unknown')
            
            print(f"⚡ [validation] Executing step {step_num}/{len(validation_sequence)}: Validate transition: {from_node} → {to_node}")
            
            # Execute the navigation step directly
            result = execute_navigation_step_directly(host, selected_device, step, team_id)
            
            if not result['success']:
                print(f"❌ [validation] Validation failed at step {step_num}: {result.get('error', 'Unknown error')}")
                break
            
            print(f"✅ [validation] Step {step_num} completed successfully")
            current_node = step.get('to_node_id')
            
            # Execute target node verifications if they exist
            target_verifications = step.get('target_verifications', [])
            if target_verifications:
                print(f"🔍 [validation] Executing {len(target_verifications)} target verifications...")
                
                for verification in target_verifications:
                    verify_result = execute_verification_directly(host, selected_device, verification)
                    
                    if not verify_result['success']:
                        print(f"❌ [validation] Verification failed: {verify_result.get('error', 'Unknown error')}")
                        break
                    
                    print(f"✅ [validation] Verification passed: {verify_result.get('message', 'Success')}")
                else:
                    continue  # All verifications passed, continue to next step
                break  # Verification failed, exit loop
        else:
            print("🎉 [validation] All validation steps completed successfully!")
            
    except KeyboardInterrupt:
        print("\n⚠️ [validation] Validation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ [validation] Unexpected error: {str(e)}")
        sys.exit(1)
    finally:
        # Always release device control
        if 'device_key' in locals() and 'session_id' in locals():
            print("🔓 [validation] Releasing control of device...")
            release_device_control(device_key, session_id, "validation")


if __name__ == "__main__":
    main() 