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

from src.utils.script_utils import load_navigation_tree, _get_node_verifications

from src.utils.app_utils import load_environment_variables  # Add this import

def main():
    # Load environment variables
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '..', 'web', '.env.host')  # Correct path: test_scripts/../web/.env.host
    if os.path.exists(env_path):
        load_environment_variables(mode='host', calling_script_dir=os.path.dirname(env_path))
        print("✅ Loaded environment variables from {env_path}")
    else:
        print("⚠️ .env.host not found at {env_path}")
    
    userinterface_name = "horizon_android_mobile"  # From your query
    team_id = "7fdeb4bb-3639-4ec3-959f-b54769a219ce"  # From your logs
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