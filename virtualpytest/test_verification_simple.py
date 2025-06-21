#!/usr/bin/env python3
"""
Simple Image Verification Test

This script tests image verification using the same process as the web interface:
1. Provide default_capture.png as reference image
2. Take current screenshot 
3. Compare reference vs current screenshot
4. Return verification result

Assumes the host is already registered with the server.
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.utils.host_utils import global_host_object, get_local_controller


def test_image_verification_like_web():
    """Test image verification following the same process as web interface"""
    
    print("=" * 60)
    print("IMAGE VERIFICATION TEST (Web Process Compatible)")
    print("=" * 60)
    
    # Check if host is registered
    if not global_host_object:
        print("❌ No registered host object found")
        print("💡 Run the host registration process first")
        return False
    
    print(f"✅ Host registered: {global_host_object.get('device_name', 'unknown')}")
    print(f"   Device Model: {global_host_object.get('device_model', 'unknown')}")
    print(f"   Device IP: {global_host_object.get('device_ip', 'unknown')}")
    
    # Get required controllers
    av_controller = get_local_controller('av')
    verification_image = get_local_controller('verification_image')
    
    print()
    print("Controller Status:")
    print(f"   AV Controller: {'✅ Available' if av_controller else '❌ Not available'}")
    print(f"   Image Verification: {'✅ Available' if verification_image else '❌ Not available'}")
    
    if not av_controller:
        print("❌ AV controller required for taking screenshots")
        return False
        
    if not verification_image:
        print("❌ Image verification controller required")
        return False
    
    print()
    
    # Step 1: Take current screenshot (same as web interface does)
    print("📸 Step 1: Taking current screenshot...")
    try:
        current_screenshot_path = av_controller.take_screenshot()
        if not current_screenshot_path:
            print("❌ Failed to take current screenshot")
            return False
        print(f"✅ Current screenshot saved: {current_screenshot_path}")
    except Exception as e:
        print(f"❌ Screenshot error: {e}")
        return False
    
    # Step 2: Prepare verification config (same format as web interface)
    reference_image = 'default_capture.png'
    verification_config = {
        'verification_type': 'image',
        'command': 'waitForImageToAppear',
        'params': {
            'image_path': reference_image,  # Reference image provided by user
            'threshold': 0.8,               # 80% similarity threshold
            'timeout': 5.0,                 # 5 second timeout
            'area': None                    # Search entire image
        }
    }
    
    print(f"🔍 Step 2: Preparing image verification...")
    print(f"   Reference image: {reference_image}")
    print(f"   Current screenshot: {os.path.basename(current_screenshot_path)}")
    print(f"   Similarity threshold: {verification_config['params']['threshold'] * 100}%")
    print(f"   Timeout: {verification_config['params']['timeout']}s")
    
    # Step 3: Execute verification (same as web interface process)
    print(f"⚡ Step 3: Executing verification...")
    try:
        # This is the same call that the web interface makes
        result = verification_image.execute_verification(verification_config, current_screenshot_path)
        
        print()
        print("=" * 40)
        print("VERIFICATION RESULT")
        print("=" * 40)
        
        # Display standardized result format
        success = result.get('success', False)
        message = result.get('message', 'No message')
        confidence = result.get('confidence', 0.0)
        
        print(f"✅ Success: {success}")
        print(f"📝 Message: {message}")
        print(f"🎯 Confidence: {confidence:.3f} ({confidence * 100:.1f}%)")
        
        # Display detailed information if available
        details = result.get('details', {})
        if details:
            print(f"📊 Details:")
            for key, value in details.items():
                if isinstance(value, float):
                    print(f"   {key}: {value:.3f}")
                else:
                    print(f"   {key}: {value}")
        
        # Display execution info
        if 'execution_time_ms' in result:
            print(f"⏱️  Execution Time: {result['execution_time_ms']}ms")
        
        print()
        
        # Final result
        if success:
            print("🎉 IMAGE VERIFICATION PASSED")
            print(f"   The reference image '{reference_image}' was found in the current screenshot")
            print(f"   with {confidence * 100:.1f}% confidence (threshold: {verification_config['params']['threshold'] * 100}%)")
            return True
        else:
            print("❌ IMAGE VERIFICATION FAILED")
            print(f"   The reference image '{reference_image}' was not found in the current screenshot")
            print(f"   Confidence: {confidence * 100:.1f}% (required: {verification_config['params']['threshold'] * 100}%)")
            
            # Show helpful debugging info
            if 'error' in result:
                print(f"   Error: {result['error']}")
            
            return False
            
    except Exception as e:
        print(f"\n❌ VERIFICATION EXECUTION ERROR: {e}")
        print(f"   This is the same error you would see in the web interface")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main test function"""
    print("Starting Image Verification Test (Web Process Compatible)")
    print("This test follows the exact same process as the web interface:")
    print("1. Take current screenshot")
    print("2. Compare against reference image (default_capture.png)")
    print("3. Return verification result")
    print()
    
    success = test_image_verification_like_web()
    
    print()
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    if success:
        print("🎉 VERIFICATION TEST PASSED")
        print("   ✅ Host registration working")
        print("   ✅ Controllers available")
        print("   ✅ Screenshot capture working")
        print("   ✅ Image verification working")
        print("   ✅ Same process as web interface")
    else:
        print("❌ VERIFICATION TEST FAILED")
        print("   Check the error messages above for details")
    
    print(f"\nFinal Result: {'✅ PASSED' if success else '❌ FAILED'}")
    
    return 0 if success else 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 