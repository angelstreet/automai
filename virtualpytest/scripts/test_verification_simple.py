#!/usr/bin/env python3
"""
Simple Image Verification Test

Tests waitForImageToAppear using simplified VerificationController method.
This script gets host information from the running Flask app.

Usage:
    cd virtualpytest
    PYTHONPATH=. python3 scripts/test_verification_simple.py
"""

import sys
import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables from .env file in the same directory as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f"✅ Loaded environment from: {env_path}")
else:
    print(f"⚠️ No .env file found at: {env_path}")
    print("   Using default values")

# Add the project root to Python path so 'src' imports work
project_root = os.path.dirname(script_dir)
sys.path.insert(0, project_root)

from src.controllers.verification_controller import execute_image_verification


def get_host_info_from_flask():
    """Get host information from the running Flask app"""
    try:
        # Get HOST_URL from environment, fallback to localhost:6109
        host_url = os.getenv('HOST_URL', 'http://localhost:6109')
        flask_status_url = f"{host_url}/host/verification/getStatus"
        
        print(f"🔍 Connecting to Flask app at: {flask_status_url}")
        
        # Try to get host status from the Flask app verification endpoint
        response = requests.get(flask_status_url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                # Create a host_device object from the status response
                return {
                    'device_name': data.get('host_name', 'unknown'),
                    'device_model': data.get('device_model', 'unknown'),
                    'host_name': data.get('host_name', 'unknown'),
                    'status': 'online'
                }
        return None
    except Exception as e:
        print(f"❌ Could not connect to Flask app: {e}")
        print(f"   URL attempted: {flask_status_url}")
        return None


def test_wait_for_image(reference_name="default_capture"):
    """Test waitForImageToAppear with specified reference"""
    
    # Get host information from Flask app
    print("🔍 Getting host information from Flask app...")
    host_device = get_host_info_from_flask()
    
    if not host_device:
        print("❌ No host found. Make sure the Flask app is running and host is registered.")
        print("💡 Run: python3 src/web/app_host.py")
        return False
    
    print(f"✅ Host: {host_device.get('device_name', 'unknown')}")
    print(f"   Model: {host_device.get('device_model', 'unknown')}")
    print(f"   Status: {host_device.get('status', 'unknown')}")
    
    # Execute waitForImageToAppear - everything handled automatically
    print(f"🚀 Executing waitForImageToAppear for '{reference_name}'...")
    
    try:
        # Simple call - all complexity handled by VerificationController
        result = execute_image_verification(
            reference_name=reference_name,
            host_device=host_device,
            command='waitForImageToAppear'
            # threshold, timeout, area all use smart defaults
        )
        
        # Display result
        success = result.get('success', False)
        confidence = result.get('confidence', 0.0)
        message = result.get('message', 'No message')
        
        if success:
            print(f"🎉 PASSED - Image '{reference_name}' found!")
            print(f"   Confidence: {confidence:.1%}")
        else:
            print(f"❌ FAILED - Image '{reference_name}' not found")
            print(f"   Message: {message}")
        
        return success
        
    except Exception as e:
        print(f"❌ Execution error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main function"""
    # Change this variable to test different references
    REFERENCE_NAME = "default_capture"
    
    print(f"Testing waitForImageToAppear with reference: {REFERENCE_NAME}")
    print(f"HOST_URL: {os.getenv('HOST_URL', 'http://localhost:6109 (default)')}")
    print()
    
    success = test_wait_for_image(REFERENCE_NAME)
    
    print()
    print("=" * 50)
    result_text = "✅ PASSED" if success else "❌ FAILED"
    print(f"Final Result: {result_text}")
    
    return 0 if success else 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 