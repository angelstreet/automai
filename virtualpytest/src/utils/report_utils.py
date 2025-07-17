"""
Report Generation Utilities

This module provides functions for generating HTML validation reports with embedded screenshots.
Reports include execution metrics, step-by-step results, and error analysis.
Enhanced for manager-friendly compact view with collapsible sections and theme support.
"""

import os
import base64
from datetime import datetime
from typing import Dict, List, Optional
from .report_template_utils import create_themed_html_template

def generate_validation_report(report_data: Dict) -> str:
    """
    Generate HTML validation report with embedded CSS and screenshots.
    
    Args:
        report_data: Dictionary containing all report information
        
    Returns:
        Complete HTML report as string
    """
    try:
        print(f"[@utils:report_utils:generate_validation_report] Generating report for {report_data.get('script_name')}")
        
        # Extract report data
        script_name = report_data.get('script_name', 'Unknown Script')
        device_info = report_data.get('device_info', {})
        host_info = report_data.get('host_info', {})
        execution_time = report_data.get('execution_time', 0)
        success = report_data.get('success', False)
        step_results = report_data.get('step_results', [])
        screenshots = report_data.get('screenshots', {})
        error_msg = report_data.get('error_msg', '')
        timestamp = report_data.get('timestamp', datetime.now().strftime('%Y%m%d%H%M%S'))
        start_time = report_data.get('start_time', timestamp)
        end_time = report_data.get('end_time', timestamp)
        
        # Calculate stats
        total_steps = len(step_results)
        passed_steps = sum(1 for step in step_results if step.get('success', False))
        failed_steps = total_steps - passed_steps
        
        # Generate HTML content
        html_template = create_themed_html_template()
        
        # Replace placeholders with actual content
        html_content = html_template.format(
            script_name=script_name,
            start_time=format_timestamp(start_time),
            end_time=format_timestamp(end_time),
            success_status="PASS" if success else "FAIL",
            success_class="success" if success else "failure",
            execution_time=format_execution_time(execution_time),
            device_name=device_info.get('device_name', 'Unknown Device'),
            device_model=device_info.get('device_model', 'Unknown Model'),
            host_name=host_info.get('host_name', 'Unknown Host'),
            total_steps=total_steps,
            passed_steps=passed_steps,
            failed_steps=failed_steps,
            step_results_html=create_compact_step_results_section(step_results, screenshots),
            error_section=create_error_section(error_msg) if error_msg else '',
            initial_screenshot=get_thumbnail_screenshot_html(screenshots.get('initial')),
            final_screenshot=get_thumbnail_screenshot_html(screenshots.get('final'))
        )
        
        print(f"[@utils:report_utils:generate_validation_report] Report generated successfully")
        return html_content
        
    except Exception as e:
        print(f"[@utils:report_utils:generate_validation_report] Error: {str(e)}")
        return create_error_report(str(e))

def create_compact_step_results_section(step_results: List[Dict], screenshots: Dict) -> str:
    """Create HTML for compact step-by-step results."""
    if not step_results:
        return '<p>No steps executed</p>'
    
    steps_html = ['<div class="step-list">']
    step_screenshots = screenshots.get('steps', [])
    
    for i, step in enumerate(step_results):
        step_number = step.get('step_number', i + 1)
        success = step.get('success', False)
        message = step.get('message', 'No message')
        execution_time = step.get('execution_time_ms', 0)
        start_time = step.get('start_time', 'N/A')
        end_time = step.get('end_time', 'N/A')
        from_node = step.get('from_node', 'Unknown')
        to_node = step.get('to_node', 'Unknown')
        actions = step.get('actions', [])
        verifications = step.get('verifications', [])
        
        # Format execution time
        exec_time_str = format_execution_time(execution_time) if execution_time else "N/A"
        
        # Format timing for header
        timing_header = f"Start: {start_time} End: {end_time} Duration: {exec_time_str}"
        
        # Format detailed actions and verifications
        actions_html = ""
        if actions:
            actions_html = "<div><strong>Actions:</strong></div>"
            for i, action in enumerate(actions, 1):
                command = action.get('command', 'unknown')
                params = action.get('params', {})
                label = action.get('label', '')
                
                # Format params as key=value pairs, excluding wait_time for cleaner display
                filtered_params = {k: v for k, v in params.items() if k != 'wait_time'}
                params_str = ", ".join([f"{k}='{v}'" for k, v in filtered_params.items()]) if filtered_params else ""
                
                # Create action line with label if available
                if label:
                    action_line = f"{i}. {label}: {command}({params_str})" if params_str else f"{i}. {label}: {command}"
                else:
                    action_line = f"{i}. {command}({params_str})" if params_str else f"{i}. {command}"
                
                actions_html += f'<div class="action-item">{action_line}</div>'
        
        verifications_html = ""
        verification_results = step.get('verification_results', [])
        
        if verifications:
            verifications_html = "<div><strong>Verifications:</strong></div>"
            for i, verification in enumerate(verifications, 1):
                # Handle different verification formats
                if isinstance(verification, dict):
                    command = verification.get('command', verification.get('type', verification.get('verification_type', 'unknown')))
                    params = verification.get('params', verification.get('parameters', {}))
                    label = verification.get('label', '')
                    
                    # Format params, excluding common system params
                    filtered_params = {k: v for k, v in params.items() if k not in ['wait_time', 'timeout']}
                    params_str = ", ".join([f"{k}='{v}'" for k, v in filtered_params.items()]) if filtered_params else ""
                    
                    # Create verification line with label if available
                    if label:
                        verification_line = f"{i}. {label}: {command}({params_str})" if params_str else f"{i}. {label}: {command}"
                    else:
                        verification_line = f"{i}. {command}({params_str})" if params_str else f"{i}. {command}"
                else:
                    verification_line = f"{i}. {str(verification)}"
                
                # Add verification result if available
                verification_result_html = ""
                if i <= len(verification_results):
                    result = verification_results[i-1]  # 0-indexed array
                    result_success = result.get('success', False)
                    result_message = result.get('message', '')
                    result_badge = f'<span class="verification-result-badge {'success' if result_success else 'failure'}">{'PASS' if result_success else 'FAIL'}</span>'
                    verification_result_html = f" {result_badge}"
                    if not result_success and result.get('error'):
                        verification_result_html += f" <span class='verification-error'>({result['error']})</span>"
                
                verifications_html += f'<div class="verification-item">{verification_line}{verification_result_html}</div>'
        elif verification_results:
            # Show verification results even if verification definitions are missing
            verifications_html = "<div><strong>Verification Results:</strong></div>"
            for i, result in enumerate(verification_results, 1):
                result_success = result.get('success', False)
                result_message = result.get('message', 'Verification completed')
                verification_type = result.get('verification_type', 'unknown')
                result_badge = f'<span class="verification-result-badge {'success' if result_success else 'failure'}">{'PASS' if result_success else 'FAIL'}</span>'
                
                verification_line = f"{i}. {verification_type}: {result_message}"
                if not result_success and result.get('error'):
                    verification_line += f" <span class='verification-error'>({result['error']})</span>"
                
                verifications_html += f'<div class="verification-item">{verification_line} {result_badge}</div>'
        
        # Get corresponding screenshot
        screenshot_html = ''
        if i < len(step_screenshots) and step_screenshots[i]:
            screenshot_html = f"""
            <div class="step-screenshot-container">
                {get_thumbnail_screenshot_html(step_screenshots[i])}
            </div>
            """
        
        step_html = f"""
        <div class="step-item {'success' if success else 'failure'}" onclick="toggleStep('step-details-{i}')">
            <div class="step-number">{step_number}</div>
            <div class="step-status">
                <span class="step-status-badge {'success' if success else 'failure'}">
                    {'PASS' if success else 'FAIL'}
                </span>
            </div>
            <div class="step-message">
                {message}
                <div class="step-timing-inline">{timing_header}</div>
            </div>
        </div>
        <div id="step-details-{i}" class="step-details">
             <div class="step-details-content">
                 <div class="step-info">
                     {actions_html}
                     {verifications_html}
                 </div>
                 {screenshot_html}
             </div>
        </div>
        """
        steps_html.append(step_html)
    
    steps_html.append('</div>')
    return ''.join(steps_html)

def create_error_section(error_msg: str) -> str:
    """Create HTML for error section."""
    return f"""
    <div class="section">
        <div class="error-section">
            <h3>Error Details</h3>
            <div class="error-message">{error_msg}</div>
        </div>
    </div>
    """

def get_thumbnail_screenshot_html(screenshot_path: Optional[str], label: str = None) -> str:
    """Get HTML for displaying a thumbnail screenshot that expands on click."""
    if not screenshot_path or not os.path.exists(screenshot_path):
        return ''
    
    try:
        # Convert screenshot to base64 for embedding
        with open(screenshot_path, 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
        
        data_url = f"data:image/jpeg;base64,{img_data}"
        
        return f"""
        <div class="screenshot-container">
            <span class="screenshot-label">{label or 'Screenshot'}</span>
            <img src="{data_url}" alt="Screenshot" class="screenshot-thumbnail" onclick="openScreenshot('{data_url}')">
        </div>
        """
    except Exception as e:
        print(f"[@utils:report_utils:get_thumbnail_screenshot_html] Error embedding screenshot {screenshot_path}: {e}")
        return ''

def get_screenshot_html(screenshot_path: Optional[str], label: str = None) -> str:
    """Legacy function - redirects to thumbnail version."""
    return get_thumbnail_screenshot_html(screenshot_path, label)

def format_timestamp(timestamp: str) -> str:
    """Format timestamp for display."""
    try:
        # Convert YYYYMMDDHHMMSS to readable format
        dt = datetime.strptime(timestamp, '%Y%m%d%H%M%S')
        return dt.strftime('%H:%M:%S')
    except:
        return timestamp

def format_execution_time(execution_time_ms: int) -> str:
    """Format execution time for display."""
    if execution_time_ms < 1000:
        return f"{execution_time_ms}ms"
    elif execution_time_ms < 60000:
        return f"{execution_time_ms / 1000:.1f}s"
    else:
        minutes = execution_time_ms // 60000
        seconds = (execution_time_ms % 60000) / 1000
        return f"{minutes}m {seconds:.1f}s"

def create_error_report(error_message: str) -> str:
    """Create a minimal error report when report generation fails."""
    return f"""<!DOCTYPE html>
<html>
<head>
    <title>Report Generation Error</title>
    <style>
        body {{ font-family: Arial, sans-serif; padding: 20px; }}
        .error {{ color: red; background: #ffe6e6; padding: 20px; border-radius: 5px; }}
    </style>
</head>
<body>
    <h1>Report Generation Error</h1>
    <div class="error">
        <h3>Error occurred while generating the report:</h3>
        <p>{error_message}</p>
    </div>
</body>
</html>"""