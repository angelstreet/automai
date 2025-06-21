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


def execute_remote_adb_verification(host_device, search_term, command='waitForElementToAppear'):
    """Execute ADB verification by calling the host's ADB verification API"""
    try:
        host_url = host_device.get('host_url')
        if not host_url:
            return {
                'success': False,
                'message': 'No host URL available'
            }
        
        # Build the ADB verification execution URL
        verification_url = f"{host_url}/host/verification/adb/execute"
        
        # Create the verification payload
        verification_payload = {
            'verification': {
                'command': command,
                'params': {
                    'search_term': search_term,
                    'timeout': 10.0,
                    'check_interval': 1.0
                }
            }
        }
        
        print(f"🔗 Calling host ADB verification API: {verification_url}")
        print(f"📋 Verification command: {command}")
        print(f"🔍 Search term: {search_term}")
        
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
                    'message': verification_result.get('message', 'ADB verification completed'),
                    'wait_time': verification_result.get('wait_time'),
                    'total_matches': verification_result.get('total_matches'),
                    'matches': verification_result.get('matches', [])
                }
            else:
                return {
                    'success': False,
                    'message': result.get('error', 'Host ADB verification failed')
                }
        else:
            return {
                'success': False,
                'message': f'Host API call failed: {response.status_code} - {response.text}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Error calling host ADB verification API: {str(e)}'
        }


def execute_remote_text_verification(host_device, text, command='waitForTextToAppear'):
    """Execute text verification by calling the host's text verification API"""
    try:
        host_url = host_device.get('host_url')
        if not host_url:
            return {
                'success': False,
                'message': 'No host URL available'
            }
        
        # Step 1: Take a screenshot first (text verification needs a source image)
        print(f"📸 Taking screenshot for text verification...")
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
            
            # Get the screenshot URL and extract filename
            screenshot_url_result = screenshot_result.get('screenshot_url')
            if not screenshot_url_result:
                return {
                    'success': False,
                    'message': 'No screenshot URL returned'
                }
            
            import os
            screenshot_filename = os.path.basename(screenshot_url_result.split('?')[0])
            print(f"✅ Screenshot taken: {screenshot_filename}")
            
        except Exception as screenshot_error:
            return {
                'success': False,
                'message': f'Error taking screenshot: {str(screenshot_error)}'
            }
        
        # Step 2: Execute text verification using the screenshot
        verification_url = f"{host_url}/host/verification/text/execute"
        
        # Create the verification payload
        verification_payload = {
            'verification': {
                'command': command,
                'params': {
                    'text': text,
                    'timeout': 10.0,
                    'case_sensitive': False
                }
            },
            'source_filename': screenshot_filename
        }
        
        print(f"🔗 Calling host text verification API: {verification_url}")
        print(f"📋 Verification command: {command}")
        print(f"📝 Text to find: {text}")
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
                    'message': verification_result.get('message', 'Text verification completed'),
                    'extracted_text': verification_result.get('extracted_text'),
                    'detected_language': verification_result.get('detected_language'),
                    'ocr_confidence': verification_result.get('ocr_confidence')
                }
            else:
                return {
                    'success': False,
                    'message': result.get('error', 'Host text verification failed')
                }
        else:
            return {
                'success': False,
                'message': f'Host API call failed: {response.status_code} - {response.text}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Error calling host text verification API: {str(e)}'
        }


def execute_remote_video_verification(host_device, command='waitForVideoToAppear', **params):
    """Execute video verification by calling the host's video verification API"""
    try:
        host_url = host_device.get('host_url')
        if not host_url:
            return {
                'success': False,
                'message': 'No host URL available'
            }
        
        # Build the video verification execution URL
        verification_url = f"{host_url}/host/verification/video/execute"
        
        # Create the verification payload with default parameters
        default_params = {
            'motion_threshold': 5.0,
            'duration': 3.0,
            'timeout': 10.0
        }
        default_params.update(params)  # Override with provided params
        
        verification_payload = {
            'verification': {
                'command': command,
                'params': default_params
            }
        }
        
        print(f"🔗 Calling host video verification API: {verification_url}")
        print(f"📋 Verification command: {command}")
        print(f"🎬 Parameters: {default_params}")
        
        # Make the API call to the host
        response = requests.post(
            verification_url,
            json=verification_payload,
            timeout=60  # Video verification might take longer
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                verification_result = result.get('verification_result', {})
                return {
                    'success': verification_result.get('success', False),
                    'confidence': verification_result.get('confidence', 0.0),
                    'message': verification_result.get('message', 'Video verification completed'),
                    'details': verification_result.get('details', {})
                }
            else:
                return {
                    'success': False,
                    'message': result.get('error', 'Host video verification failed')
                }
        else:
            return {
                'success': False,
                'message': f'Host API call failed: {response.status_code} - {response.text}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Error calling host video verification API: {str(e)}'
        }


def execute_remote_audio_verification(host_device, command='verify_audio_playing', **params):
    """Execute audio verification by calling the host's audio verification API"""
    try:
        host_url = host_device.get('host_url')
        if not host_url:
            return {
                'success': False,
                'message': 'No host URL available'
            }
        
        # Build the audio verification execution URL
        verification_url = f"{host_url}/host/verification/audio/execute"
        
        # Create the verification payload with default parameters
        default_params = {
            'min_level': 10.0,
            'duration': 2.0
        }
        default_params.update(params)  # Override with provided params
        
        verification_payload = {
            'verification': {
                'command': command,
                'params': default_params
            }
        }
        
        print(f"🔗 Calling host audio verification API: {verification_url}")
        print(f"📋 Verification command: {command}")
        print(f"🔊 Parameters: {default_params}")
        
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
                    'message': verification_result.get('message', 'Audio verification completed'),
                    'details': verification_result.get('details', {})
                }
            else:
                return {
                    'success': False,
                    'message': result.get('error', 'Host audio verification failed')
                }
        else:
            return {
                'success': False,
                'message': f'Host API call failed: {response.status_code} - {response.text}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Error calling host audio verification API: {str(e)}'
        }


def execute_remote_appium_verification(host_device, search_term, command='waitForElementToAppear'):
    """Execute Appium verification by calling the host's Appium verification API"""
    try:
        host_url = host_device.get('host_url')
        if not host_url:
            return {
                'success': False,
                'message': 'No host URL available'
            }
        
        # Build the Appium verification execution URL
        verification_url = f"{host_url}/host/verification/appium/execute"
        
        # Create the verification payload
        verification_payload = {
            'verification': {
                'command': command,
                'params': {
                    'search_term': search_term,
                    'timeout': 10.0,
                    'check_interval': 1.0
                }
            }
        }
        
        print(f"🔗 Calling host Appium verification API: {verification_url}")
        print(f"📋 Verification command: {command}")
        print(f"🔍 Search term: {search_term}")
        
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
                    'message': verification_result.get('message', 'Appium verification completed'),
                    'wait_time': verification_result.get('wait_time'),
                    'total_matches': verification_result.get('total_matches'),
                    'matches': verification_result.get('matches', []),
                    'platform': verification_result.get('platform')
                }
            else:
                return {
                    'success': False,
                    'message': result.get('error', 'Host Appium verification failed')
                }
        else:
            return {
                'success': False,
                'message': f'Host API call failed: {response.status_code} - {response.text}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Error calling host Appium verification API: {str(e)}'
        }


def test_wait_for_image(reference_name="default_capture"):
    """Test image verification using the host's verification API remotely."""
    print(f"\n🖼️  TESTING IMAGE VERIFICATION")
    print(f"=" * 50)
    
    try:
        # Get host information from Flask app
        host_device = get_host_info_from_flask()
        if not host_device:
            print("❌ FAILED - Could not get host information")
            return False
        
        print(f"🏠 Connected to host: {host_device.get('host_name', 'unknown')}")
        print(f"📱 Device: {host_device.get('device_model', 'unknown')}")
        
        # Execute image verification
        result = execute_remote_image_verification(host_device, reference_name=reference_name)
        
        if result['success']:
            print(f"✅ SUCCESS - Image '{reference_name}' found!")
            print(f"   Confidence: {result.get('confidence', 0):.1%}")
            print(f"   Message: {result['message']}")
            if result.get('location'):
                print(f"   Location: {result['location']}")
            if result.get('execution_time'):
                print(f"   Execution time: {result['execution_time']:.2f}s")
            return True
        else:
            print(f"❌ FAILED - {result['message']}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False


def test_adb_verification(search_term="Settings"):
    """Test ADB verification using the host's verification API remotely."""
    print(f"\n📱 TESTING ADB VERIFICATION")
    print(f"=" * 50)
    
    try:
        # Get host information from Flask app
        host_device = get_host_info_from_flask()
        if not host_device:
            print("❌ FAILED - Could not get host information")
            return False
        
        print(f"🏠 Connected to host: {host_device.get('host_name', 'unknown')}")
        print(f"📱 Device: {host_device.get('device_model', 'unknown')}")
        
        # Execute ADB verification
        result = execute_remote_adb_verification(host_device, search_term=search_term)
        
        if result['success']:
            print(f"✅ SUCCESS - Element '{search_term}' found!")
            print(f"   Confidence: {result.get('confidence', 0):.1%}")
            print(f"   Message: {result['message']}")
            if result.get('wait_time'):
                print(f"   Wait time: {result['wait_time']:.2f}s")
            if result.get('total_matches'):
                print(f"   Total matches: {result['total_matches']}")
            return True
        else:
            print(f"❌ FAILED - {result['message']}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False


def test_text_verification(text="Settings"):
    """Test text verification using the host's verification API remotely."""
    print(f"\n📝 TESTING TEXT VERIFICATION")
    print(f"=" * 50)
    
    try:
        # Get host information from Flask app
        host_device = get_host_info_from_flask()
        if not host_device:
            print("❌ FAILED - Could not get host information")
            return False
        
        print(f"🏠 Connected to host: {host_device.get('host_name', 'unknown')}")
        print(f"📱 Device: {host_device.get('device_model', 'unknown')}")
        
        # Execute text verification
        result = execute_remote_text_verification(host_device, text=text)
        
        if result['success']:
            print(f"✅ SUCCESS - Text '{text}' found!")
            print(f"   Confidence: {result.get('confidence', 0):.1%}")
            print(f"   Message: {result['message']}")
            if result.get('extracted_text'):
                print(f"   Extracted text: '{result['extracted_text']}'")
            if result.get('detected_language'):
                print(f"   Detected language: {result['detected_language']}")
            return True
        else:
            print(f"❌ FAILED - {result['message']}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False


def test_video_verification():
    """Test video verification using the host's verification API remotely."""
    print(f"\n🎬 TESTING VIDEO VERIFICATION")
    print(f"=" * 50)
    
    try:
        # Get host information from Flask app
        host_device = get_host_info_from_flask()
        if not host_device:
            print("❌ FAILED - Could not get host information")
            return False
        
        print(f"🏠 Connected to host: {host_device.get('host_name', 'unknown')}")
        print(f"📱 Device: {host_device.get('device_model', 'unknown')}")
        
        # Execute video verification (detect motion)
        result = execute_remote_video_verification(host_device, 
                                                 command='detect_motion',
                                                 duration=3.0,
                                                 threshold=5.0)
        
        if result['success']:
            print(f"✅ SUCCESS - Motion detected!")
            print(f"   Confidence: {result.get('confidence', 0):.1%}")
            print(f"   Message: {result['message']}")
            return True
        else:
            print(f"❌ FAILED - {result['message']}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False


def test_audio_verification():
    """Test audio verification using the host's verification API remotely."""
    print(f"\n🔊 TESTING AUDIO VERIFICATION")
    print(f"=" * 50)
    
    try:
        # Get host information from Flask app
        host_device = get_host_info_from_flask()
        if not host_device:
            print("❌ FAILED - Could not get host information")
            return False
        
        print(f"🏠 Connected to host: {host_device.get('host_name', 'unknown')}")
        print(f"📱 Device: {host_device.get('device_model', 'unknown')}")
        
        # Execute audio verification
        result = execute_remote_audio_verification(host_device, 
                                                 command='verify_audio_playing',
                                                 min_level=10.0,
                                                 duration=2.0)
        
        if result['success']:
            print(f"✅ SUCCESS - Audio playing detected!")
            print(f"   Confidence: {result.get('confidence', 0):.1%}")
            print(f"   Message: {result['message']}")
            return True
        else:
            print(f"❌ FAILED - {result['message']}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False


def main():
    """Main test function - demonstrates all verification types."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Test verification system using remote host API calls',
        epilog='''
Examples:
  python3 scripts/test_verification_simple.py                    # Test image verification with default reference
  python3 scripts/test_verification_simple.py my_button         # Test image verification with custom reference
  python3 scripts/test_verification_simple.py --test-type adb Settings   # Test ADB verification for "Settings"
  python3 scripts/test_verification_simple.py --test-type text Home      # Test text verification for "Home"
  python3 scripts/test_verification_simple.py --test-type all            # Test all verification types
        ''',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('search_term', nargs='?', default='default_capture',
                       help='Reference image name (for image) or search term (for adb/text) (default: default_capture for image, Settings for adb/text)')
    
    parser.add_argument('--test-type', choices=['image', 'adb', 'text', 'video', 'audio', 'all'], 
                       default='image',
                       help='Type of verification to test (default: image)')
    
    args = parser.parse_args()
    
    # Set appropriate defaults based on test type
    if args.test_type in ['adb', 'text'] and args.search_term == 'default_capture':
        search_term = 'Settings'  # Default for ADB/text verification
    else:
        search_term = args.search_term
    
    print("🧪 VirtualPyTest - Remote Verification Testing")
    print("=" * 60)
    
    if args.test_type == 'image':
        success = test_wait_for_image(search_term)
    elif args.test_type == 'adb':
        success = test_adb_verification(search_term)
    elif args.test_type == 'text':
        success = test_text_verification(search_term)
    elif args.test_type == 'video':
        success = test_video_verification()
    elif args.test_type == 'audio':
        success = test_audio_verification()
    elif args.test_type == 'all':
        print("🔄 Testing all verification types...")
        # For 'all' type, use appropriate defaults
        image_name = search_term if search_term != 'default_capture' else 'default_capture'
        adb_search = 'Settings'
        text_search = 'Settings'
        
        results = []
        results.append(("Image", test_wait_for_image(image_name)))
        results.append(("ADB", test_adb_verification(adb_search)))
        results.append(("Text", test_text_verification(text_search)))
        results.append(("Video", test_video_verification()))
        results.append(("Audio", test_audio_verification()))
        
        print(f"\n📊 SUMMARY")
        print("=" * 30)
        success_count = 0
        for test_name, test_result in results:
            status = "✅ PASS" if test_result else "❌ FAIL"
            print(f"{test_name:10} {status}")
            if test_result:
                success_count += 1
        
        print(f"\nOverall: {success_count}/{len(results)} tests passed")
        success = success_count == len(results)
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 All tests completed successfully!")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
    
    return success


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 