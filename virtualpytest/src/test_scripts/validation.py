#!/usr/bin/env python3
"""
Validation Script for VirtualPyTest

This script validates all transitions in a navigation tree by:
1. Taking control of a device
2. Loading the navigation tree
3. Finding validation sequence
4. Executing each validation step directly using host controllers
5. Generating HTML report with screenshots
6. Uploading report to R2 storage
7. Recording results in database
8. Releasing device control

Usage:
    python -m src.test_scripts.validation <userinterface_name> [--host <host>] [--device <device>]
    
Example:
    python -m src.test_scripts.validation horizon_android_mobile
    python -m src.test_scripts.validation horizon_android_mobile --device device2
"""

import sys
import argparse
import time
from typing import Dict, Any, Optional
from datetime import datetime

# Add project root to path for imports
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(src_dir)

if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import utilities
from src.utils.script_utils import (
    create_host_from_environment, 
    select_device_from_host,
    execute_navigation_step_directly,
    capture_validation_screenshot
)
from src.utils.build_url_utils import capture_screenshot, download_screenshot

# Import pathfinding for validation sequence
from src.lib.navigation.navigation_pathfinding import find_optimal_edge_validation_sequence

# Import report generation
from src.utils.report_utils import generate_validation_report
from src.utils.cloudflare_utils import upload_script_report, upload_validation_screenshots
from src.lib.supabase.script_results_db import record_script_execution_start, update_script_execution_result


def main():
    """Main validation function with report generation"""
    parser = argparse.ArgumentParser(description='Validate navigation tree transitions')
    parser.add_argument('userinterface_name', help='Name of the userinterface to validate (e.g., horizon_android_mobile)')
    parser.add_argument('--host', help='Specific host to use (optional)')
    parser.add_argument('--device', help='Specific device to use (optional)')
    
    args = parser.parse_args()
    
    userinterface_name = args.userinterface_name
    host_name = args.host
    device_id = args.device
    
    print(f"🎯 [validation] Starting validation for: {userinterface_name}")
    
    # Initialize variables for cleanup
    device_key = None
    session_id = None
    script_result_id = None
    start_time = time.time()
    step_results = []
    screenshot_paths = []
    overall_success = False
    error_message = ""
    
    # Initialize flag before the main try block
    updated_db = False

    try:
        # 1. Setup script environment (centralized)
        setup_result = setup_script_environment("validation")
        if not setup_result['success']:
            error_message = f"Setup failed: {setup_result['error']}"
            print(f"❌ [validation] {error_message}")
            sys.exit(1)
        
        host = setup_result['host']
        team_id = setup_result['team_id']
        
        # 2. Select device (centralized)
        device_result = select_device(host, device_id, "validation")
        if not device_result['success']:
            error_message = f"Device selection failed: {device_result['error']}"
            print(f"❌ [validation] {error_message}")
            sys.exit(1)
        
        selected_device = device_result['device']
        
        # 3. Record script execution start in database
        script_result_id = record_script_execution_start(
            team_id=team_id,
            script_name="validation",
            script_type="validation",
            userinterface_name=userinterface_name,
            host_name=host.host_name,
            device_name=selected_device.device_name,
            metadata={
                'validation_sequence_count': 0,  # Will be updated
                'device_id': selected_device.device_id,
                'device_model': selected_device.device_model
            }
        )
        
        if not script_result_id:
            print("⚠️ [validation] Failed to record script start in database, continuing...")
        else:
            print(f"📝 [validation] Script execution recorded with ID: {script_result_id}")
        
        # 4. Take device control (centralized)
        control_result = take_device_control(host, selected_device, "validation")
        if not control_result['success']:
            error_message = f"Failed to take device control: {control_result['error']}"
            print(f"❌ [validation] {error_message}")
            sys.exit(1)
        
        session_id = control_result['session_id']
        device_key = control_result['device_key']
        
        # 5. Load navigation tree (centralized function)
        tree_result = load_navigation_tree(userinterface_name, "validation")
        if not tree_result['success']:
            error_message = f"Tree loading failed: {tree_result['error']}"
            print(f"❌ [validation] {error_message}")
            sys.exit(1)
        
        tree_data = tree_result['tree']
        tree_id = tree_result['tree_id']
        
        # 6. Get validation sequence (use userinterface_name directly like web does)
        print("📋 [validation] Getting validation sequence...")
        validation_sequence = find_optimal_edge_validation_sequence(userinterface_name, team_id)
        
        if not validation_sequence:
            error_message = "No validation sequence found"
            print(f"❌ [validation] {error_message}")
            sys.exit(1)
        
        print(f"✅ [validation] Found {len(validation_sequence)} validation steps")
        
        # 7. Capture initial state screenshot
        print("📸 [validation] Capturing initial state screenshot...")
        host_dict = create_host_dict_for_executor(host)
        initial_screenshot = capture_validation_screenshot(host_dict, selected_device, "initial_state", "validation")
        if initial_screenshot:
            screenshot_paths.append(initial_screenshot)
            print(f"✅ [validation] Initial screenshot captured: {initial_screenshot}")
        else:
            print("⚠️ [validation] Failed to capture initial screenshot, continuing...")
        
        # 8. Execute validation steps using NavigationExecutor (same as web interface)
        print("🎮 [validation] Starting validation on device", selected_device.device_id)
        
        # Import NavigationExecutor
        from src.lib.navigation.navigation_execution import NavigationExecutor
        
        # Initialize NavigationExecutor with host configuration
        host_config = {
            'host_name': host.host_name,
            'device_model': selected_device.device_model,  # Add device model for verification context
        }
        navigator = NavigationExecutor(host_config, selected_device.device_id, team_id)
        
        current_node = None
        successful_steps = 0
        failed_steps = 0
        for i, step in enumerate(validation_sequence):
            step_num = i + 1
            from_node = step.get('from_node_label', 'unknown')
            to_node = step.get('to_node_label', 'unknown')
            target_node_id = step.get('to_node_id', 'unknown')
            
            print(f"⚡ [validation] Executing step {step_num}/{len(validation_sequence)}: Validate transition: {from_node} → {to_node}")
            
            try:
                # Execute complete navigation including verifications using NavigationExecutor
                # This matches exactly what the web interface does
                result = navigator.execute_navigation(
                    tree_id=tree_id,
                    target_node_id=target_node_id,
                    current_node_id=current_node
                )
                
                # Extract step timing information
                step_start_time = datetime.now()
                step_end_time = datetime.now()
                
                if result.get('success'):
                    print(f"✅ [validation] Step {step_num} completed successfully")
                    current_node = target_node_id  # Update current position
                    
                    # Check for verification results
                    verification_results = result.get('verification_results', [])
                    if verification_results:
                        print(f"✅ [validation] Executed {len(verification_results)} verifications")
                        for ver_result in verification_results:
                            if ver_result.get('success'):
                                print(f"  ✅ Verification passed: {ver_result.get('verification_name', 'unknown')}")
                            else:
                                print(f"  ❌ Verification failed: {ver_result.get('verification_name', 'unknown')} - {ver_result.get('error', 'unknown error')}")
                    else:
                        print("ℹ️ [validation] No verifications defined for this transition")
                else:
                    print(f"❌ [validation] Step {step_num} failed: {result.get('error', 'Unknown error')}")
                    current_node = result.get('final_position_node_id', current_node)  # Update to actual position
                
                # Capture screenshot after each step
                step_screenshot_path = None
                try:
                    print(f"📸 [validation] Capturing screenshot: step_{step_num}")
                    screenshot_data = capture_screenshot(host, selected_device)
                    if screenshot_data:
                        step_screenshot_path = download_screenshot(screenshot_data, f"step_{step_num}")
                        print(f"✅ [validation] Screenshot saved: {step_screenshot_path}")
                except Exception as screenshot_error:
                    print(f"⚠️ [validation] Screenshot capture failed: {screenshot_error}")
                
                # Record step result with enhanced data
                step_result = {
                    'step_number': step_num,
                    'from_node': from_node,
                    'to_node': to_node,
                    'success': result.get('success', False),
                    'error_message': result.get('error') if not result.get('success') else None,
                    'screenshot_path': step_screenshot_path,
                    'step_start_time': step_start_time,
                    'step_end_time': step_end_time,
                    'execution_time': result.get('execution_time', 0),
                    'transitions_executed': result.get('transitions_executed', 0),
                    'total_transitions': result.get('total_transitions', 0),
                    'actions_executed': result.get('actions_executed', 0),
                    'total_actions': result.get('total_actions', 0),
                    'verification_results': result.get('verification_results', []),
                    'actions': step.get('actions', []),
                    'verifications': step.get('verifications', [])  # Include step verifications for reporting
                }
                step_results.append(step_result)
                
                if result.get('success'):
                    successful_steps += 1
                else:
                    failed_steps += 1
                    
            except Exception as e:
                print(f"❌ [validation] Step {step_num} failed with exception: {str(e)}")
                
                # Capture screenshot even on failure
                step_screenshot_path = None
                try:
                    print(f"📸 [validation] Capturing screenshot: step_{step_num}_failed")
                    screenshot_data = capture_screenshot(host, selected_device)
                    if screenshot_data:
                        step_screenshot_path = download_screenshot(screenshot_data, f"step_{step_num}_failed")
                        print(f"✅ [validation] Screenshot saved: {step_screenshot_path}")
                except Exception as screenshot_error:
                    print(f"⚠️ [validation] Screenshot capture failed: {screenshot_error}")
                
                step_result = {
                    'step_number': step_num,
                    'from_node': from_node,
                    'to_node': to_node,
                    'success': False,
                    'error_message': str(e),
                    'screenshot_path': step_screenshot_path,
                    'step_start_time': datetime.now(),
                    'step_end_time': datetime.now(),
                    'execution_time': 0,
                    'transitions_executed': 0,
                    'total_transitions': 0,
                    'actions_executed': 0,
                    'total_actions': 0,
                    'verification_results': [],
                    'actions': step.get('actions', []),
                    'verifications': step.get('verifications', [])
                }
                step_results.append(step_result)
                failed_steps += 1
        
        # 9. Capture final state screenshot
        print("📸 [validation] Capturing final state...")
        final_screenshot = None
        try:
            screenshot_data = capture_screenshot(host, selected_device)
            if screenshot_data:
                final_screenshot = download_screenshot(screenshot_data, "final_state")
                print(f"✅ [validation] Final screenshot captured: {final_screenshot}")
        except Exception as e:
            print(f"⚠️ [validation] Failed to capture final screenshot: {e}")
        
        # 10. Calculate overall success and generate execution summary
        overall_success = failed_steps == 0
        execution_timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        total_execution_time = int((time.time() - start_time) * 1000)
        
        print(f"🎯 [validation] Validation completed!")
        print(f"   ✅ Successful steps: {successful_steps}")
        print(f"   ❌ Failed steps: {failed_steps}")
        print(f"   📊 Success rate: {(successful_steps/(successful_steps+failed_steps)*100):.1f}%" if (successful_steps+failed_steps) > 0 else "   📊 Success rate: 0%")
        print(f"   ⏱️ Total execution time: {total_execution_time/1000:.1f}s")
        
        # 11. Generate HTML report
        print("📄 [validation] Generating HTML report...")
        report_data = {
            'script_name': 'validation.py',
            'device_info': {
                'device_name': selected_device.device_name,
                'device_model': selected_device.device_model,
                'device_id': selected_device.device_id
            },
            'host_info': {
                'host_name': host.host_name
            },
            'execution_time': total_execution_time,
            'success': overall_success,
            'step_results': step_results,
            'screenshots': {
                'initial': initial_screenshot if initial_screenshot else None,
                'steps': [step['screenshot_path'] for step in step_results if step['screenshot_path']],
                'final': final_screenshot if final_screenshot else None
            },
            'error_msg': None if overall_success else f"{failed_steps} steps failed",
            'timestamp': execution_timestamp,
            'userinterface_name': userinterface_name,
            'total_steps': len(validation_sequence),
            'passed_steps': successful_steps,
            'failed_steps': failed_steps
        }
        
        html_content = generate_validation_report(report_data)
        print("✅ [validation] HTML report generated")
        
        # 12. Upload report and screenshots to R2
        print("☁️ [validation] Uploading report to R2 storage...")
        
        # Upload HTML report
        upload_result = upload_script_report(
            html_content=html_content,
            device_model=selected_device.device_model,
            script_name="validation",
            timestamp=execution_timestamp
        )
        
        report_url = ""
        if upload_result['success']:
            report_url = upload_result['report_url']
            print(f"✅ [validation] Report uploaded: {report_url}")
            
            # Upload screenshots
            if screenshot_paths:
                screenshot_result = upload_validation_screenshots(
                    screenshot_paths=screenshot_paths,
                    device_model=selected_device.device_model,
                    script_name="validation",
                    timestamp=execution_timestamp
                )
                
                if screenshot_result['success']:
                    print(f"✅ [validation] Screenshots uploaded: {screenshot_result['uploaded_count']} files")
                else:
                    print(f"⚠️ [validation] Screenshot upload failed: {screenshot_result.get('error', 'Unknown error')}")
        else:
            print(f"⚠️ [validation] Report upload failed: {upload_result.get('error', 'Unknown error')}")
        
        # 13. Update database with final results
        if script_result_id:
            print("📝 [validation] Updating database with final results...")
            update_success = update_script_execution_result(
                script_result_id=script_result_id,
                success=overall_success,
                execution_time_ms=total_execution_time,
                html_report_r2_path=upload_result.get('report_path') if upload_result['success'] else None,
                html_report_r2_url=report_url if report_url else None,
                error_msg=error_message if error_message else None,
                metadata={
                    'validation_sequence_count': len(validation_sequence),
                    'step_results_count': len(step_results),
                    'screenshots_captured': len(screenshot_paths),
                    'passed_steps': sum(1 for step in step_results if step.get('success', False)),
                    'failed_steps': sum(1 for step in step_results if not step.get('success', True))
                }
            )
            
            if update_success:
                updated_db = True  # Set flag after successful update
                print("✅ [validation] Database updated successfully")
            else:
                print("⚠️ [validation] Failed to update database")
        
        # 14. Summary
        print("\n" + "="*60)
        print(f"🎯 [validation] VALIDATION SUMMARY")
        print("="*60)
        print(f"📱 Device: {selected_device.device_name} ({selected_device.device_model})")
        print(f"🖥️  Host: {host.host_name}")
        print(f"📋 Interface: {userinterface_name}")
        print(f"⏱️  Total Time: {total_execution_time/1000:.1f}s")
        print(f"📊 Steps: {len(step_results)}/{len(validation_sequence)} executed")
        print(f"✅ Passed: {sum(1 for step in step_results if step.get('success', False))}")
        print(f"❌ Failed: {sum(1 for step in step_results if not step.get('success', True))}")
        print(f"📸 Screenshots: {len(screenshot_paths)} captured")
        print(f"🔗 Report: {report_url if report_url else 'Not uploaded'}")
        print(f"🎯 Overall Result: {'PASS' if overall_success else 'FAIL'}")
        print("="*60)
            
    except KeyboardInterrupt:
        error_message = "Validation interrupted by user"
        print(f"\n⚠️ [validation] {error_message}")
        sys.exit(1)
    except Exception as e:
        error_message = f"Unexpected error: {str(e)}"
        print(f"❌ [validation] {error_message}")
        sys.exit(1)
    finally:
        # Always release device control
        if device_key and session_id:
            print("🔓 [validation] Releasing control of device...")
            release_device_control(device_key, session_id, "validation")
        
        # Update database if we have an error and script_result_id
        if script_result_id and error_message and not overall_success and not updated_db:  # Add condition to check flag
            print("📝 [validation] Recording error in database...")
            total_time = int((time.time() - start_time) * 1000)
            update_script_execution_result(
                script_result_id=script_result_id,
                success=False,
                execution_time_ms=total_time,
                error_msg=error_message
            )


if __name__ == "__main__":
    main() 