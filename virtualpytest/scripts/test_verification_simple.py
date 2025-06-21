#!/usr/bin/env python3
"""
Simple Image Verification Test

Tests waitForImageToAppear by calling the host's verification API remotely.
This script gets host information from the running Flask app and then calls the verification endpoint.

Usage:
    cd virtualpytest
    python3 scripts/test_verification_simple.py [reference_name]
    
Examples:
    python3 scripts/test_verification_simple.py                    # Uses default: "default_capture"
    python3 scripts/test_verification_simple.py my_image          # Uses "my_image"
    python3 scripts/test_verification_simple.py home_button.png   # Uses "home_button.png"
"""

import sys
import os
import requests
import json
import argparse
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
                    'status': 'online',
                    'host_url': host_url  # Store the host URL for API calls
                }
        return None
    except Exception as e:
        print(f"❌ Could not connect to Flask app: {e}")
        print(f"   URL attempted: {flask_status_url}")
        return None


def execute_remote_image_verification(host_device, reference_name, command='waitForImageToAppear'):
    """Execute image verification by calling the host's verification API"""
    try:
        host_url = host_device.get('host_url')
        if not host_url:
            return {
                'success': False,
                'message': 'No host URL available'
            }
        
        # Step 1: Take a screenshot first
        print(f"📸 Taking screenshot via host API...")
        screenshot_url = f"{host_url}/host/av/take-screenshot"
        
        try:
            screenshot_response = requests.post(screenshot_url, json={}, timeout=10)
            if screenshot_response.status_code != 200:
                return {
                    'success': False,
                    'message': f'Failed to take screenshot: {screenshot_response.status_code}'
                }
            
            screenshot_result = screenshot_response.json()
            if not screenshot_result.get('success'):
                return {
                    'success': False,
                    'message': f'Screenshot failed: {screenshot_result.get("error", "Unknown error")}'
                }
            
            # Get the screenshot URL (not filename)
            screenshot_url_result = screenshot_result.get('screenshot_url')
            if not screenshot_url_result:
                return {
                    'success': False,
                    'message': 'No screenshot URL returned'
                }
            
            # Extract filename from URL (e.g., from "https://host/captures/tmp/screenshot.jpg")
            import os
            screenshot_filename = os.path.basename(screenshot_url_result.split('?')[0])
            
            print(f"✅ Screenshot taken: {screenshot_filename}")
            print(f"   Screenshot URL: {screenshot_url_result}")
            
        except Exception as screenshot_error:
            return {
                'success': False,
                'message': f'Error taking screenshot: {str(screenshot_error)}'
            }
        
        # Step 2: Execute verification using the screenshot
        verification_url = f"{host_url}/host/verification/image/execute"
        
        # Create the verification payload with proper structure
        verification_payload = {
            'verification': {
                'command': command,
                'params': {
                    'image_path': reference_name,  # Reference image name
                    'threshold': 0.8,
                    'timeout': 5.0
                }
            },
            'source_filename': screenshot_filename  # Use the actual screenshot filename
        }
        
        print(f"🔗 Calling host verification API: {verification_url}")
        print(f"📋 Verification command: {command}")
        print(f"🖼️ Reference name: {reference_name}")
        print(f"📷 Source screenshot: {screenshot_filename}")
        
        # Make the API call to the host
        response = requests.post(
            verification_url,
            json=verification_payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                verification_result = result.get('verification_result', {})
                return {
                    'success': verification_result.get('success', False),
                    'confidence': verification_result.get('confidence', 0.0),
                    'message': verification_result.get('message', 'Verification completed'),
                    'found_at': verification_result.get('found_at'),
                    'execution_time': verification_result.get('execution_time')
                }
            else:
                return {
                    'success': False,
                    'message': result.get('error', 'Host verification failed')
                }
        else:
            return {
                'success': False,
                'message': f'Host API call failed: {response.status_code} - {response.text}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Error calling host verification API: {str(e)}'
        }


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
    print(f"   URL: {host_device.get('host_url', 'unknown')}")
    
    # Execute waitForImageToAppear via remote API call
    print(f"🚀 Executing waitForImageToAppear for '{reference_name}' via host API...")
    
    try:
        # Call the host's verification API
        result = execute_remote_image_verification(
            host_device=host_device,
            reference_name=reference_name,
            command='waitForImageToAppear'
        )
        
        # Display result
        success = result.get('success', False)
        confidence = result.get('confidence', 0.0)
        message = result.get('message', 'No message')
        
        if success:
            print(f"🎉 PASSED - Image '{reference_name}' found!")
            print(f"   Confidence: {confidence:.1%}")
            if result.get('found_at'):
                print(f"   Found at: {result['found_at']}")
            if result.get('execution_time'):
                print(f"   Execution time: {result['execution_time']:.2f}s")
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
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Test waitForImageToAppear with a reference image',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scripts/test_verification_simple.py                    # Uses default: "default_capture"
  python3 scripts/test_verification_simple.py my_image          # Uses "my_image"
  python3 scripts/test_verification_simple.py home_button.png   # Uses "home_button.png"
        """
    )
    parser.add_argument(
        'image', 
        nargs='?', 
        default='default_capture',
        help='Reference image name to search for (default: default_capture)'
    )
    
    args = parser.parse_args()
    reference_name = args.image
    
    print(f"Testing waitForImageToAppear with reference: {reference_name}")
    print(f"HOST_URL: {os.getenv('HOST_URL', 'http://localhost:6109 (default)')}")
    print()
    
    success = test_wait_for_image(reference_name)
    
    print()
    print("=" * 50)
    result_text = "✅ PASSED" if success else "❌ FAILED"
    print(f"Final Result: {result_text}")
    
    return 0 if success else 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 