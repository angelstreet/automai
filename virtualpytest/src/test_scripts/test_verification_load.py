#!/usr/bin/env python3
"""
Standalone test script to verify if verifications load from a target node.
Run: python3 src/test_scripts/test_verification_load.py
"""

import sys
import os

# Add project root to path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(src_dir)
sys.path.insert(0, project_root)

from src.utils.script_utils import load_navigation_tree, _get_node_verifications, setup_script_environment

from src.utils.app_utils import load_environment_variables  # Add this import

def main():
    # Setup environment like validation.py
    setup_result = setup_script_environment("test_verification_load")
    if not setup_result['success']:
        print(f"❌ Failed setup: {setup_result['error']}")
        return
    team_id = setup_result['team_id']
    
    userinterface_name = "horizon_android_mobile"  # From your query
    test_node_id = "node-1"  # Example: "home" node from logs; change if needed
    
    print("🔄 Testing verification loading...")
    
    # Load the tree (same as validation.py)
    tree_result = load_navigation_tree(userinterface_name)
    if not tree_result['success']:
        print(f"❌ Failed to load tree: {tree_result['error']}")
        return
    
    tree_id = tree_result['tree_id']
    print(f"✅ Loaded tree ID: {tree_id}")
    
    # Get verifications for test node
    verifications = _get_node_verifications(tree_id, test_node_id, team_id)
    
    # Print results
    print(f"\n🎯 Verifications for node {test_node_id}:")
    if verifications:
        for i, v in enumerate(verifications, 1):
            print(f"  {i}. Type: {v.get('verification_type', 'unknown')}, Label: {v.get('label', 'none')}")
            print(f"     Params: {v.get('params', {})}")
            print("---")
    else:
        print("  No verifications found for this node")
    
    print(f"Total verifications: {len(verifications)}")

if __name__ == "__main__":
    main() 