#!/usr/bin/env python3
"""
Test Get All References

Tests the /server/verification/getAllReferences endpoint using the same approach as test_verification_simple.py
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


def test_get_all_references():
    """Test the /server/verification/getAllReferences endpoint"""
    print(f"\n📋 TESTING GET ALL REFERENCES")
    print(f"=" * 50)
    
    try:
        # Get host information from Flask app
        host_device = get_host_info_from_flask()
        if not host_device:
            print("❌ FAILED - Could not get host information")
            return False
        
        print(f"🏠 Connected to host: {host_device.get('host_name', 'unknown')}")
        print(f"📱 Device: {host_device.get('device_model', 'unknown')}")
        
        # Call the server endpoint directly (just replace /host/ with /server/)
        host_url = host_device.get('host_url')
        references_url = f"{host_url}/server/verification/getAllReferences"
        
        # Create the payload with host information (same format as host endpoints)
        payload = {
            'host': host_device
        }
        
        print(f"🔗 Calling server API: {references_url}")
        print(f"📋 Payload: {json.dumps(payload, indent=2)}")
        
        # Make the API call
        response = requests.post(
            references_url,
            json=payload,
            timeout=10
        )
        
        print(f"📥 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📄 Response: {json.dumps(result, indent=2)}")
            
            if result.get('success'):
                images = result.get('images', [])
                count = result.get('count', 0)
                device_model = result.get('device_model', 'unknown')
                
                print(f"✅ SUCCESS - Found {count} references!")
                print(f"   Device model: {device_model}")
                print(f"   Images count: {len(images)}")
                
                if images:
                    print(f"\n📄 References found:")
                    for i, ref in enumerate(images, 1):
                        name = ref.get('name', 'unknown')
                        ref_type = ref.get('type', 'unknown')
                        print(f"   {i}. {name} ({ref_type})")
                        if ref_type == 'reference_image':
                            r2_url = ref.get('r2_url', 'no URL')
                            print(f"      URL: {r2_url}")
                        elif ref_type == 'reference_text':
                            area = ref.get('area', {})
                            text = area.get('text', 'no text') if area else 'no text'
                            print(f"      Text: '{text}'")
                
                return count > 0
            else:
                error = result.get('error', 'Unknown error')
                print(f"❌ FAILED - Server returned error: {error}")
                return False
        else:
            print(f"❌ FAILED - HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False


def main():
    """Main test function"""
    print("🧪 VirtualPyTest - Get All References Test")
    print("=" * 60)
    
    success = test_get_all_references()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 Test completed successfully!")
    else:
        print("⚠️  Test failed. Check the output above for details.")
    
    return success


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 