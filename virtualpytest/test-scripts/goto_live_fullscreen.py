#!/usr/bin/env python3
"""
Simple Navigation Script for VirtualPyTest

This script navigates to the live_fullscreen node by:
1. Taking control of a device
2. Loading the navigation tree
3. Finding path to live_fullscreen
4. Executing navigation steps directly using host controllers
5. Releasing device control

Usage:
    python scripts/goto_live_fullscreen.py <userinterface_name> [--host <host>] [--device <device>]
    
Example:
    python scripts/goto_live_fullscreen.py horizon_android_mobile
    python scripts/goto_live_fullscreen.py horizon_android_mobile --device device2
"""

import sys
import argparse
import time
from typing import Dict, Any, Optional

# Add project root to path for imports
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import utilities
from src.utils.script_utils import (
    setup_script_environment,
    select_device,
    take_device_control,
    release_device_control,
    load_navigation_tree,
    execute_navigation_with_verifications
)

# Import pathfinding for navigation
from src.lib.navigation.navigation_pathfinding import find_shortest_path


def main():
    """Main navigation function to goto live_fullscreen"""
    parser = argparse.ArgumentParser(description='Navigate to live_fullscreen node')
    parser.add_argument('userinterface_name', help='Name of the userinterface to use (e.g., horizon_android_mobile)')
    parser.add_argument('--host', help='Specific host to use (optional)')
    parser.add_argument('--device', help='Specific device to use (optional)')
    
    args = parser.parse_args()
    
    userinterface_name = args.userinterface_name
    host_name = args.host
    device_id = args.device
    
    print(f"🎯 [goto_live_fullscreen] Starting navigation to live_fullscreen for: {userinterface_name}")
    
    # Initialize variables for cleanup
    device_key = None
    session_id = None
    start_time = time.time()
    overall_success = False
    error_message = ""
    
    try:
        # 1. Setup script environment (centralized)
        setup_result = setup_script_environment("goto_live_fullscreen")
        if not setup_result['success']:
            error_message = f"Setup failed: {setup_result['error']}"
            print(f"❌ [goto_live_fullscreen] {error_message}")
            sys.exit(1)
        
        host = setup_result['host']
        team_id = setup_result['team_id']
        
        # 2. Select device (centralized)
        device_result = select_device(host, device_id, "goto_live_fullscreen")
        if not device_result['success']:
            error_message = f"Device selection failed: {device_result['error']}"
            print(f"❌ [goto_live_fullscreen] {error_message}")
            sys.exit(1)
        
        selected_device = device_result['device']
        
        # 3. Take device control (centralized)
        control_result = take_device_control(host, selected_device, "goto_live_fullscreen")
        if not control_result['success']:
            error_message = f"Failed to take device control: {control_result['error']}"
            print(f"❌ [goto_live_fullscreen] {error_message}")
            sys.exit(1)
        
        session_id = control_result['session_id']
        device_key = control_result['device_key']
        
        # 4. Load navigation tree (centralized function)
        tree_result = load_navigation_tree(userinterface_name, "goto_live_fullscreen")
        if not tree_result['success']:
            error_message = f"Tree loading failed: {tree_result['error']}"
            print(f"❌ [goto_live_fullscreen] {error_message}")
            sys.exit(1)
        
        tree_data = tree_result['tree']
        tree_id = tree_result['tree_id']
        
        print(f"✅ [goto_live_fullscreen] Loaded tree with {len(tree_result['nodes'])} nodes and {len(tree_result['edges'])} edges")

        # 5. Find path to live_fullscreen
        print("🗺️ [goto_live_fullscreen] Finding path to live_fullscreen...")
        navigation_path = find_shortest_path(tree_id, "live_fullscreen", team_id)
        
        if not navigation_path:
            error_message = "No path found to live_fullscreen"
            print(f"❌ [goto_live_fullscreen] {error_message}")
            sys.exit(1)
        
        print(f"✅ [goto_live_fullscreen] Found path with {len(navigation_path)} steps")
        
        # 6. Execute navigation steps directly using host controllers
        print("🎮 [goto_live_fullscreen] Starting navigation on device", selected_device.device_id)
        
        for i, step in enumerate(navigation_path):
            step_num = i + 1
            from_node = step.get('from_node_label', 'unknown')
            to_node = step.get('to_node_label', 'unknown')
            
            print(f"⚡ [goto_live_fullscreen] Executing step {step_num}/{len(navigation_path)}: {from_node} → {to_node}")
            
            # Execute the navigation step directly
            step_start_time = time.time()
            result = execute_navigation_with_verifications(host, selected_device, step, team_id, tree_id)
            step_execution_time = int((time.time() - step_start_time) * 1000)
            
            if not result['success']:
                error_message = f"Navigation failed at step {step_num}: {result.get('error', 'Unknown error')}"
                print(f"❌ [goto_live_fullscreen] {error_message}")
                break
            
            print(f"✅ [goto_live_fullscreen] Step {step_num} completed successfully in {step_execution_time}ms")
        else:
            print("🎉 [goto_live_fullscreen] Successfully navigated to live_fullscreen!")
            overall_success = True
        
        # 7. Summary
        total_execution_time = int((time.time() - start_time) * 1000)
        print("\n" + "="*60)
        print(f"🎯 [goto_live_fullscreen] NAVIGATION SUMMARY")
        print("="*60)
        print(f"📱 Device: {selected_device.device_name} ({selected_device.device_model})")
        print(f"🖥️  Host: {host.host_name}")
        print(f"📋 Interface: {userinterface_name}")
        print(f"🎯 Target: live_fullscreen")
        print(f"⏱️  Total Time: {total_execution_time/1000:.1f}s")
        print(f"📊 Steps: {len(navigation_path)} total")
        print(f"🎯 Result: {'SUCCESS' if overall_success else 'FAILED'}")
        if error_message:
            print(f"❌ Error: {error_message}")
        print("="*60)
            
    except KeyboardInterrupt:
        error_message = "Navigation interrupted by user"
        print(f"\n⚠️ [goto_live_fullscreen] {error_message}")
        sys.exit(1)
    except Exception as e:
        error_message = f"Unexpected error: {str(e)}"
        print(f"❌ [goto_live_fullscreen] {error_message}")
        sys.exit(1)
    finally:
        # Always release device control
        if device_key and session_id:
            print("🔓 [goto_live_fullscreen] Releasing control of device...")
            release_device_control(device_key, session_id, "goto_live_fullscreen")


if __name__ == "__main__":
    main() 