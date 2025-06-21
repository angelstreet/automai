#!/usr/bin/env python3
"""
Simple Get All References Test

Tests the /server/verification/getAllReferences endpoint to verify the new references architecture.
This script gets host information and calls the server endpoint to fetch all references.

Usage:
    cd virtualpytest
    python3 scripts/test_get_all_references.py
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
    """Test the getAllReferences endpoint using the server API."""
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
        
        # Get the server URL (usually different from host URL)
        # For testing, we'll use the same URL but call the server endpoint
        server_url = host_device.get('host_url', 'http://localhost:6109')
        references_url = f"{server_url}/server/verification/getAllReferences"
        
        print(f"🔗 Calling server references API: {references_url}")
        
        # Create the payload with host information
        payload = {
            'host': {
                'device_name': host_device.get('device_name'),
                'device_model': host_device.get('device_model'),
                'host_name': host_device.get('host_name'),
                'status': host_device.get('status')
            }
        }
        
        print(f"📤 Sending payload: {json.dumps(payload, indent=2)}")
        
        # Make the API call to the server
        response = requests.post(
            references_url,
            json=payload,
            timeout=10
        )
        
        print(f"📥 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📄 Response data: {json.dumps(result, indent=2)}")
            
            if result.get('success'):
                images = result.get('images', [])
                count = result.get('count', 0)
                device_model = result.get('device_model', 'unknown')
                
                print(f"✅ SUCCESS - Found {count} references!")
                print(f"   Device model: {device_model}")
                print(f"   References:")
                
                # Group by type for better display
                image_refs = [img for img in images if img.get('type') == 'reference_image']
                text_refs = [img for img in images if img.get('type') == 'reference_text']
                
                print(f"   📸 Image references ({len(image_refs)}):")
                for i, img in enumerate(image_refs, 1):
                    name = img.get('name', 'unknown')
                    r2_url = img.get('r2_url', 'no URL')
                    created_at = img.get('created_at', 'unknown')
                    print(f"      {i}. {name} (created: {created_at[:10]})")
                    print(f"         URL: {r2_url}")
                
                print(f"   📝 Text references ({len(text_refs)}):")
                for i, txt in enumerate(text_refs, 1):
                    name = txt.get('name', 'unknown')
                    area = txt.get('area', {})
                    text_content = area.get('text', 'no text') if area else 'no text'
                    created_at = txt.get('created_at', 'unknown')
                    print(f"      {i}. {name} (created: {created_at[:10]})")
                    print(f"         Text: '{text_content[:50]}{'...' if len(str(text_content)) > 50 else ''}'")
                
                return True
            else:
                error = result.get('error', 'Unknown error')
                print(f"❌ FAILED - Server returned error: {error}")
                return False
        else:
            print(f"❌ FAILED - HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Error text: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False


def main():
    """Main test function."""
    print("🧪 VirtualPyTest - Get All References Test")
    print("=" * 60)
    print("Testing the new references architecture...")
    print("This should fetch references from the verifications_references table")
    
    success = test_get_all_references()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 Test completed successfully!")
        print("✅ The new references architecture is working correctly!")
    else:
        print("⚠️  Test failed. Check the output above for details.")
        print("❌ The references architecture may need debugging.")
    
    return success


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 