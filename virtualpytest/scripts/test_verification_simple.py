#!/usr/bin/env python3
"""
Simple Image Verification Test

Tests waitForImageToAppear using simplified VerificationController method.
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.utils.host_utils import global_host_object
from src.controllers.verification_controller import execute_image_verification


def test_wait_for_image(reference_name="default_capture"):
    """Test waitForImageToAppear with specified reference"""
    
    # Check host registration
    if not global_host_object:
        print("❌ No registered host found")
        return False
    
    print(f"✅ Host: {global_host_object.get('device_name', 'unknown')}")
    
    # Execute waitForImageToAppear - everything handled automatically
    print(f"🚀 Executing waitForImageToAppear for '{reference_name}'...")
    
    try:
        # Simple call - all complexity handled by VerificationController
        result = execute_image_verification(
            reference_name=reference_name,
            host_device=global_host_object,
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
        return False


def main():
    """Main function"""
    # Change this variable to test different references
    REFERENCE_NAME = "default_capture"
    
    print(f"Testing waitForImageToAppear with reference: {REFERENCE_NAME}")
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