#!/usr/bin/env python3
"""
Demo script for VirtualPyTest Power Controller

This script demonstrates the functionality of the PowerController:
- Power management (on/off/reboot)
- Status monitoring
- Device-specific power control

Run this script to see the power controller in action.
"""

import time
from power_controller import MockPowerController
from __init__ import ControllerFactory, create_device_controllers


def demo_power_controller():
    """Demonstrate PowerController functionality."""
    print("\n" + "="*60)
    print("POWER CONTROLLER DEMO")
    print("="*60)
    
    # Create power controller for Android TV
    power = MockPowerController("Living Room Android TV", "adb")
    
    # Connect and check initial status
    power.connect()
    initial_status = power.get_power_status()
    print(f"\nInitial Power State: {initial_status['power_state']}")
    
    # Demonstrate power operations
    print("\n--- Power Operations ---")
    
    # Power on if needed
    if not power.is_powered_on():
        print("Device is off, powering on...")
        power.power_on(timeout=30.0)
    else:
        print("Device is already on")
    
    # Check status after power on
    status = power.get_power_status()
    print(f"Power State: {status['power_state']}")
    print(f"Uptime: {status['uptime_seconds']} seconds")
    print(f"Power Consumption: {status['power_consumption_watts']}W")
    if status['temperature_celsius']:
        print(f"Temperature: {status['temperature_celsius']}°C")
    
    # Wait a moment
    time.sleep(2)
    
    # Demonstrate reboot
    print("\n--- Reboot Operation ---")
    power.reboot(timeout=60.0)
    
    # Check status after reboot
    status = power.get_power_status()
    print(f"Post-reboot State: {status['power_state']}")
    
    # Demonstrate graceful shutdown
    print("\n--- Graceful Shutdown ---")
    power.power_off(force=False, timeout=30.0)
    
    # Check final status
    final_status = power.get_power_status()
    print(f"Final Power State: {final_status['power_state']}")
    
    # Get controller status
    controller_status = power.get_status()
    print(f"\nController Capabilities: {controller_status['capabilities']}")
    
    power.disconnect()


def demo_factory_power_controller():
    """Demonstrate PowerController via Factory."""
    print("\n" + "="*60)
    print("POWER CONTROLLER FACTORY DEMO")
    print("="*60)
    
    # Create power controller using factory
    power = ControllerFactory.create_power_controller(
        power_type="smart_plug",
        device_name="Smart TV",
        boot_time=25.0,
        shutdown_time=8.0
    )
    
    power.connect()
    
    # Demonstrate different power operations
    print("\n--- Smart Plug Operations ---")
    power.power_on(timeout=30.0)
    
    # Wait and check status
    time.sleep(1)
    status = power.get_power_status()
    print(f"Smart Plug Status: {status}")
    
    # Demonstrate hard reboot
    print("\n--- Hard Reboot ---")
    power.hard_reboot(timeout=45.0)
    
    # Demonstrate forced shutdown
    print("\n--- Forced Shutdown ---")
    power.power_off(force=True, timeout=10.0)
    
    power.disconnect()


def demo_device_controller_set():
    """Demonstrate PowerController as part of complete device set."""
    print("\n" + "="*60)
    print("COMPLETE DEVICE CONTROLLER SET DEMO")
    print("="*60)
    
    # Create complete controller set including power
    controllers = create_device_controllers(
        device_name="Test Android TV",
        device_type="android_tv",
        power_type="adb"  # Override default power type
    )
    
    # Connect all controllers
    print("Connecting all controllers...")
    success = controllers.connect_all()
    print(f"All controllers connected: {success}")
    
    # Get complete status
    print("\n--- Complete Device Status ---")
    full_status = controllers.get_status()
    
    print(f"Device: {full_status['device_name']}")
    print(f"Remote Connected: {full_status['remote']['connected']}")
    print(f"AV Connected: {full_status['av']['connected']}")
    print(f"Verification Connected: {full_status['verification']['connected']}")
    print(f"Power Connected: {full_status['power']['connected']}")
    print(f"Power State: {full_status['power']['current_power_state']}")
    
    # Demonstrate coordinated operations
    print("\n--- Coordinated Device Operations ---")
    
    # Ensure device is powered on
    if not controllers.power.is_powered_on():
        print("Powering on device...")
        controllers.power.power_on(timeout=30.0)
    
    # Use remote control
    print("Using remote control...")
    controllers.remote.press_key("HOME")
    controllers.remote.navigate_down()
    controllers.remote.select()
    
    # Start AV capture
    print("Starting AV capture...")
    controllers.av.start_video_capture("1920x1080", 30)
    controllers.av.capture_frame("test_frame.png")
    
    # Verify something on screen
    print("Running verification...")
    controllers.verification.verify_text_appears("Home", timeout=5.0)
    
    # Stop AV capture
    controllers.av.stop_video_capture()
    
    # Power cycle the device
    print("\n--- Power Cycling Device ---")
    controllers.power.reboot(timeout=60.0)
    
    # Wait for device to be ready
    if controllers.power.wait_for_power_state("on", timeout=30.0):
        print("Device is ready after reboot")
    else:
        print("Device not ready after reboot timeout")
    
    # Disconnect all controllers
    print("\nDisconnecting all controllers...")
    controllers.disconnect_all()


def demo_power_state_monitoring():
    """Demonstrate power state monitoring and waiting."""
    print("\n" + "="*60)
    print("POWER STATE MONITORING DEMO")
    print("="*60)
    
    power = MockPowerController("Monitoring Device", "network")
    power.connect()
    
    # Demonstrate state checking
    print("--- Power State Checks ---")
    print(f"Is powered on: {power.is_powered_on()}")
    print(f"Is powered off: {power.is_powered_off()}")
    
    # Power on and wait for state
    print("\n--- Power On and Wait ---")
    power.power_on(timeout=30.0)
    
    # Wait for specific state
    print("Waiting for 'on' state...")
    if power.wait_for_power_state("on", timeout=10.0):
        print("Device reached 'on' state successfully")
    else:
        print("Timeout waiting for 'on' state")
    
    # Demonstrate soft vs hard reboot
    print("\n--- Soft vs Hard Reboot ---")
    print("Performing soft reboot...")
    power.soft_reboot(timeout=45.0)
    
    time.sleep(1)
    
    print("Performing hard reboot...")
    power.hard_reboot(timeout=45.0)
    
    power.disconnect()


if __name__ == "__main__":
    """Run all power controller demos."""
    try:
        demo_power_controller()
        demo_factory_power_controller()
        demo_device_controller_set()
        demo_power_state_monitoring()
        
        print("\n" + "="*60)
        print("ALL POWER CONTROLLER DEMOS COMPLETED")
        print("="*60)
        
    except KeyboardInterrupt:
        print("\nDemo interrupted by user")
    except Exception as e:
        print(f"\nDemo failed with error: {e}")
        import traceback
        traceback.print_exc() 