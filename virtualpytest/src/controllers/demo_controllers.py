#!/usr/bin/env python3
"""
Demo script for VirtualPyTest Mock Controllers

This script demonstrates the functionality of all three mock controllers:
- RemoteController: Simulates remote control actions
- AVController: Simulates audio/video capture and analysis
- VerificationController: Simulates verification and validation

Run this script to see the controllers in action.
"""

import time
from remote_controller import RemoteController
from av_controller import AVController
from verification_controller import VerificationController


def demo_remote_controller():
    """Demonstrate RemoteController functionality."""
    print("\n" + "="*60)
    print("REMOTE CONTROLLER DEMO")
    print("="*60)
    
    # Create remote controller for FireTV
    remote = RemoteController("firetv", "Living Room FireTV")
    
    # Connect and perform basic navigation
    remote.connect()
    remote.power()
    
    # Navigate through menus
    remote.press_key("HOME")
    time.sleep(0.5)
    remote.press_key("DOWN")
    remote.press_key("DOWN")
    remote.press_key("RIGHT")
    remote.press_key("OK")
    
    # Type some text
    remote.input_text("Netflix")
    remote.press_key("ENTER")
    
    # Use navigation methods
    remote.navigate_down()
    remote.navigate_down()
    remote.navigate_down()
    remote.navigate_right()
    remote.navigate_right()
    remote.select()
    
    # Volume control
    remote.volume_up()
    remote.volume_up()
    remote.volume_up()
    remote.volume_down()
    remote.mute()
    
    # Get status and disconnect
    status = remote.get_status()
    print(f"\nRemote Status: {status}")
    remote.disconnect()


def demo_av_controller():
    """Demonstrate AVController functionality."""
    print("\n" + "="*60)
    print("AV CONTROLLER DEMO")
    print("="*60)
    
    # Create AV controller
    av = AVController("Living Room FireTV", "HDMI")
    
    # Connect and start capturing
    av.connect()
    av.start_video_capture("1920x1080", 30)
    av.start_audio_capture(44100, 2)
    
    # Capture some frames and analyze
    av.capture_frame("test_frame_1.png")
    av.capture_frame("test_frame_2.png")
    
    # Analyze video content
    motion_result = av.analyze_video_content("motion")
    color_result = av.analyze_video_content("color")
    brightness_result = av.analyze_video_content("brightness")
    
    # Audio detection
    audio_level = av.detect_audio_level()
    silence_detected = av.detect_silence(5.0, 2.0)
    
    # Wait for video change
    change_detected = av.wait_for_video_change(5.0, 10.0)
    
    # Record a session
    av.record_session(3.0, "demo_recording.mp4")
    
    # Stop capturing and get status
    av.stop_video_capture()
    av.stop_audio_capture()
    status = av.get_status()
    print(f"\nAV Status: {status}")
    av.disconnect()


def demo_verification_controller():
    """Demonstrate VerificationController functionality."""
    print("\n" + "="*60)
    print("VERIFICATION CONTROLLER DEMO")
    print("="*60)
    
    # Create verification controller
    verify = VerificationController("Living Room FireTV")
    
    # Connect and perform verifications
    verify.connect()
    
    # Image and text verification
    verify.verify_image_appears("netflix_logo.png", 10.0, 0.8)
    verify.verify_text_appears("Continue Watching", 5.0, False)
    
    # Element verification
    verify.verify_element_exists("play_button", "button")
    verify.verify_element_exists("search_box", "input")
    
    # Audio and video verification
    verify.verify_audio_playing(15.0, 3.0)
    verify.verify_video_playing(10.0, 3.0)
    
    # Color and state verification
    verify.verify_color_present("#FF0000", 15.0)
    verify.verify_screen_state("ready", 5.0)
    
    # Performance verification
    verify.verify_performance_metric("fps", 30.0, 10.0)
    verify.verify_performance_metric("load_time", 2.5, 20.0)
    
    # Generic wait and verify
    verify.wait_and_verify("image", "home_screen.png", 8.0, confidence=0.9)
    verify.wait_and_verify("text", "Settings", 5.0, case_sensitive=True)
    
    # Get verification results
    results = verify.get_verification_results()
    print(f"\nVerification Results: {len(results)} checks performed")
    for i, result in enumerate(results[-3:], 1):  # Show last 3 results
        print(f"  {i}. {result['type']}: {result['target']} -> {'PASS' if result['result'] else 'FAIL'}")
    
    # Get status and disconnect
    status = verify.get_status()
    print(f"\nVerification Status: {status}")
    verify.disconnect()


def demo_integrated_test_scenario():
    """Demonstrate an integrated test scenario using all controllers."""
    print("\n" + "="*60)
    print("INTEGRATED TEST SCENARIO DEMO")
    print("="*60)
    print("Scenario: Launch Netflix and verify video playback")
    
    # Initialize all controllers
    remote = RemoteController("firetv", "Test Device")
    av = AVController("Test Device", "HDMI")
    verify = VerificationController("Test Device")
    
    # Connect all controllers
    print("\n--- Connecting Controllers ---")
    remote.connect()
    av.connect()
    verify.connect()
    
    # Start monitoring
    print("\n--- Starting Monitoring ---")
    av.start_video_capture("1920x1080", 30)
    av.start_audio_capture(44100, 2)
    
    # Test scenario steps
    print("\n--- Test Steps ---")
    
    # Step 1: Power on and go to home
    print("Step 1: Power on device and navigate to home")
    remote.power()
    remote.press_key("HOME")
    verify.verify_screen_state("ready", 5.0)
    
    # Step 2: Launch Netflix
    print("Step 2: Launch Netflix application")
    remote.input_text("Netflix")
    remote.press_key("ENTER")
    verify.verify_image_appears("netflix_logo.png", 10.0, 0.8)
    
    # Step 3: Navigate to content
    print("Step 3: Navigate to video content")
    remote.navigate_down()
    remote.navigate_down()
    remote.navigate_down()
    remote.navigate_right()
    remote.navigate_right()
    remote.select()
    
    # Step 4: Verify video playback
    print("Step 4: Verify video and audio playback")
    verify.verify_video_playing(5.0, 3.0)
    verify.verify_audio_playing(10.0, 2.0)
    
    # Step 5: Test volume control
    print("Step 5: Test volume control")
    remote.volume_up()
    remote.volume_up()
    remote.volume_up()
    remote.volume_down()
    remote.mute()
    audio_level_high = av.detect_audio_level()
    
    # Step 6: Capture evidence
    print("Step 6: Capture test evidence")
    av.capture_frame("playback_verification.png")
    av.record_session(2.0, "test_evidence.mp4")
    
    # Cleanup
    print("\n--- Cleanup ---")
    av.stop_video_capture()
    av.stop_audio_capture()
    
    # Get final results
    print("\n--- Test Results ---")
    verification_results = verify.get_verification_results()
    passed = sum(1 for r in verification_results if r['result'])
    total = len(verification_results)
    print(f"Verification Results: {passed}/{total} checks passed")
    
    # Disconnect all controllers
    remote.disconnect()
    av.disconnect()
    verify.disconnect()
    
    print(f"\nTest Scenario Complete: {passed}/{total} verifications passed")


def main():
    """Run all controller demos."""
    print("VirtualPyTest Mock Controllers Demo")
    print("This demo shows the functionality of all three mock controllers")
    
    try:
        # Individual controller demos
        demo_remote_controller()
        demo_av_controller()
        demo_verification_controller()
        
        # Integrated scenario
        demo_integrated_test_scenario()
        
        print("\n" + "="*60)
        print("DEMO COMPLETE")
        print("="*60)
        print("All mock controllers demonstrated successfully!")
        print("These controllers can be used in test automation scenarios")
        print("to simulate real device interactions and verifications.")
        
    except Exception as e:
        print(f"\nDemo failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main() 