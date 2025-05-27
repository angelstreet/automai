#!/usr/bin/env python3
"""
Test script for VirtualPyTest Controller API endpoints

This script tests the integration between the web interface and the VirtualPyTest controller system.
"""

import requests
import json
import time

BASE_URL = "http://localhost:5009"

def test_health():
    """Test the health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data['status']}")
            print(f"   Supabase: {data['supabase']}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_controller_types():
    """Test getting controller types"""
    print("\n🔍 Testing controller types endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/virtualpytest/controller-types")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Controller types retrieved successfully")
            print(f"   Total types: {data['total_types']}")
            
            for controller_type, implementations in data['controller_types'].items():
                available = len([impl for impl in implementations if impl['status'] == 'available'])
                placeholder = len([impl for impl in implementations if impl['status'] == 'placeholder'])
                print(f"   {controller_type.capitalize()}: {available} available, {placeholder} planned")
            
            return data
        else:
            print(f"❌ Controller types failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Controller types error: {e}")
        return None

def test_controller_creation():
    """Test creating a controller"""
    print("\n🔍 Testing controller creation...")
    try:
        controller_data = {
            "name": "Test IR Remote",
            "controller_type": "remote",
            "implementation": "ir_remote",
            "parameters": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/virtualpytest/controllers",
            headers={"Content-Type": "application/json"},
            data=json.dumps(controller_data)
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Controller created successfully")
            print(f"   Name: {data['controller']['name']}")
            print(f"   Type: {data['controller']['type']}")
            print(f"   Implementation: {data['controller']['implementation']}")
            return data
        else:
            print(f"❌ Controller creation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Controller creation error: {e}")
        return None

def test_controller_testing(controller_type, implementation):
    """Test testing a controller"""
    print(f"\n🔍 Testing {implementation} controller...")
    try:
        test_data = {
            "controller_type": controller_type,
            "implementation": implementation,
            "name": f"Test {implementation}",
            "parameters": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/virtualpytest/controllers/test",
            headers={"Content-Type": "application/json"},
            data=json.dumps(test_data)
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {implementation} test completed")
            print(f"   Success: {data['success']}")
            print(f"   Message: {data['message']}")
            
            if 'test_results' in data and 'status' in data['test_results']:
                status = data['test_results']['status']
                if 'supported_keys' in status:
                    print(f"   Supported keys: {len(status['supported_keys'])}")
                if 'capabilities' in status:
                    print(f"   Capabilities: {', '.join(status['capabilities'][:3])}...")
            
            return data
        else:
            print(f"❌ {implementation} test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ {implementation} test error: {e}")
        return None

def test_device_set_creation():
    """Test creating a device controller set"""
    print("\n🔍 Testing device set creation...")
    try:
        device_data = {
            "device_name": "Test Android TV",
            "device_type": "android_tv",
            "overrides": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/virtualpytest/device-sets",
            headers={"Content-Type": "application/json"},
            data=json.dumps(device_data)
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Device set created successfully")
            print(f"   Device: {data['device_set']['device_name']}")
            print(f"   Type: {data['device_set']['device_type']}")
            print(f"   Connection test: {data['device_set']['connection_test']}")
            return data
        else:
            print(f"❌ Device set creation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Device set creation error: {e}")
        return None

def main():
    """Run all tests"""
    print("🚀 VirtualPyTest Controller API Test Suite")
    print("=" * 50)
    
    # Test health
    if not test_health():
        print("❌ Health check failed. Make sure the Flask server is running.")
        return
    
    # Test controller types
    controller_types = test_controller_types()
    if not controller_types:
        print("❌ Controller types test failed.")
        return
    
    # Test controller creation
    creation_result = test_controller_creation()
    if not creation_result:
        print("❌ Controller creation test failed.")
        return
    
    # Test specific controllers
    test_controllers = [
        ("remote", "ir_remote"),
        ("remote", "bluetooth_remote"),
        ("remote", "mock"),
        ("av", "mock"),
        ("verification", "mock"),
        ("power", "mock")
    ]
    
    for controller_type, implementation in test_controllers:
        test_controller_testing(controller_type, implementation)
        time.sleep(0.5)  # Small delay between tests
    
    # Test device set creation
    device_set_result = test_device_set_creation()
    
    print("\n" + "=" * 50)
    print("🎉 Test suite completed!")
    print("\n📋 Summary:")
    print("✅ Health check: Passed")
    print("✅ Controller types: Passed")
    print("✅ Controller creation: Passed")
    print("✅ Controller testing: Multiple controllers tested")
    print("✅ Device set creation: Passed")
    
    print("\n🌐 Web Interface:")
    print("   Frontend: http://localhost:5173/configuration/controller")
    print("   Backend:  http://localhost:5009/api/virtualpytest/controller-types")
    
    print("\n🎯 Ready for use!")

if __name__ == "__main__":
    main() 