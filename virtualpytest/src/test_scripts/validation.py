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
    setup_script_environment,
    select_device,
    take_device_control,
    release_device_control,
    load_navigation_tree,
    execute_navigation_step_directly,
    execute_verification_directly,
    capture_validation_screenshot,
    create_host_dict_for_executor
)

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
    start_timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
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
        
        # 8. Execute validation steps directly using host controllers
        print("🎮 [validation] Starting validation on device", selected_device.device_id)
        
        current_node = None
        for i, step in enumerate(validation_sequence):
            step_num = i + 1
            from_node = step.get('from_node_label', 'unknown')
            to_node = step.get('to_node_label', 'unknown')
            
            print(f"⚡ [validation] Executing step {step_num}/{len(validation_sequence)}: Validate transition: {from_node} → {to_node}")
            
            # Execute the navigation step directly
            step_start_time = time.time()
            result = execute_navigation_step_directly(host, selected_device, step, team_id)
            step_execution_time = int((time.time() - step_start_time) * 1000)
            
            # Capture screenshot after step execution
            step_screenshot = capture_validation_screenshot(host_dict, selected_device, f"step_{step_num}", "validation")
            if step_screenshot:
                screenshot_paths.append(step_screenshot)
            
            # Record step result
            step_result = {
                'step_number': step_num,
                'success': result['success'],
                'screenshot_path': step_screenshot,
                'message': f"Transition: {from_node} → {to_node}",
                'execution_time_ms': step_execution_time,
                'from_node': from_node,
                'to_node': to_node
            }
            step_results.append(step_result)
            
            if not result['success']:
                error_message = f"Validation failed at step {step_num}: {result.get('error', 'Unknown error')}"
                print(f"❌ [validation] {error_message}")
                break
            
            print(f"✅ [validation] Step {step_num} completed successfully")
            current_node = step.get('to_node_id')
            
            # Execute target node verifications if they exist
            target_verifications = step.get('target_verifications', [])
            if target_verifications:
                print(f"🔍 [validation] Executing {len(target_verifications)} target verifications...")
                
                for verification in target_verifications:
                    verify_result = execute_verification_directly(host, selected_device, verification)
                    
                    if not verify_result['success']:
                        error_message = f"Verification failed: {verify_result.get('error', 'Unknown error')}"
                        print(f"❌ [validation] {error_message}")
                        break
                    
                    print(f"✅ [validation] Verification passed: {verify_result.get('message', 'Success')}")
                else:
                    continue  # All verifications passed, continue to next step
                break  # Verification failed, exit loop
        else:
            print("🎉 [validation] All validation steps completed successfully!")
            overall_success = True
        
        # 9. Capture final state screenshot
        print("📸 [validation] Capturing final state screenshot...")
        final_screenshot = capture_validation_screenshot(host_dict, selected_device, "final_state", "validation")
        if final_screenshot:
            screenshot_paths.append(final_screenshot)
            print(f"✅ [validation] Final screenshot captured: {final_screenshot}")
        else:
            print("⚠️ [validation] Failed to capture final screenshot, continuing...")
        
        # 10. Generate execution timestamp and calculate total time
        execution_timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        total_execution_time = int((time.time() - start_time) * 1000)
        
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
            'error_msg': error_message,
            'timestamp': execution_timestamp,
            'start_time': start_timestamp,
            'end_time': execution_timestamp,
            'userinterface_name': userinterface_name,
            'total_steps': len(validation_sequence),
            'passed_steps': sum(1 for step in step_results if step.get('success', False)),
            'failed_steps': sum(1 for step in step_results if not step.get('success', True))
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