"""
Report Generation Utilities

This module provides functions for generating HTML validation reports with embedded screenshots.
Reports include execution metrics, step-by-step results, and error analysis.
"""

import os
import base64
from datetime import datetime
from typing import Dict, List, Optional

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
        
        # Generate HTML content
        html_template = create_html_template()
        
        # Replace placeholders with actual content
        html_content = html_template.format(
            script_name=script_name,
            timestamp=format_timestamp(timestamp),
            success_status="PASS" if success else "FAIL",
            success_class="success" if success else "failure",
            execution_time=format_execution_time(execution_time),
            device_name=device_info.get('device_name', 'Unknown Device'),
            device_model=device_info.get('device_model', 'Unknown Model'),
            host_name=host_info.get('host_name', 'Unknown Host'),
            total_steps=len(step_results),
            passed_steps=sum(1 for step in step_results if step.get('success', False)),
            failed_steps=sum(1 for step in step_results if not step.get('success', True)),
            step_results_html=create_step_results_section(step_results, screenshots),
            error_section=create_error_section(error_msg) if error_msg else '',
            initial_screenshot=get_screenshot_html(screenshots.get('initial')),
            final_screenshot=get_screenshot_html(screenshots.get('final'))
        )
        
        print(f"[@utils:report_utils:generate_validation_report] Report generated successfully")
        return html_content
        
    except Exception as e:
        print(f"[@utils:report_utils:generate_validation_report] Error: {str(e)}")
        return create_error_report(str(e))

def create_html_template() -> str:
    """Create the base HTML template with embedded CSS."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validation Report - {script_name}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        
        .header .timestamp {{
            opacity: 0.9;
            font-size: 1.1em;
        }}
        
        .summary {{
            padding: 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }}
        
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }}
        
        .summary-card {{
            background: white;
            padding: 20px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-align: center;
        }}
        
        .summary-card h3 {{
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            margin-bottom: 10px;
        }}
        
        .summary-card .value {{
            font-size: 1.8em;
            font-weight: bold;
        }}
        
        .success {{
            color: #28a745;
        }}
        
        .failure {{
            color: #dc3545;
        }}
        
        .neutral {{
            color: #6c757d;
        }}
        
        .content {{
            padding: 30px;
        }}
        
        .section {{
            margin-bottom: 40px;
        }}
        
        .section h2 {{
            color: #495057;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }}
        
        .step {{
            background: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #dee2e6;
        }}
        
        .step.success {{
            border-left-color: #28a745;
        }}
        
        .step.failure {{
            border-left-color: #dc3545;
        }}
        
        .step-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }}
        
        .step-title {{
            font-weight: bold;
            font-size: 1.1em;
        }}
        
        .step-status {{
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
            text-transform: uppercase;
        }}
        
        .step-status.success {{
            background: #d4edda;
            color: #155724;
        }}
        
        .step-status.failure {{
            background: #f8d7da;
            color: #721c24;
        }}
        
        .screenshot {{
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            margin-top: 15px;
            cursor: pointer;
            transition: transform 0.2s;
        }}
        
        .screenshot:hover {{
            transform: scale(1.02);
        }}
        
        .screenshot-container {{
            text-align: center;
            margin: 20px 0;
        }}
        
        .screenshot-label {{
            display: block;
            color: #6c757d;
            font-size: 0.9em;
            margin-bottom: 10px;
        }}
        
        .error-section {{
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 6px;
            padding: 20px;
            margin-top: 20px;
        }}
        
        .error-section h3 {{
            color: #721c24;
            margin-bottom: 10px;
        }}
        
        .error-message {{
            font-family: 'Courier New', monospace;
            background: #fff;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #dee2e6;
            white-space: pre-wrap;
            overflow-x: auto;
        }}
        
        .screenshots-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }}
        
        @media (max-width: 768px) {{
            .summary-grid {{
                grid-template-columns: 1fr;
            }}
            
            .screenshots-grid {{
                grid-template-columns: 1fr;
            }}
            
            .step-header {{
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Validation Report</h1>
            <div class="timestamp">{timestamp}</div>
        </div>
        
        <div class="summary">
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Overall Status</h3>
                    <div class="value {success_class}">{success_status}</div>
                </div>
                <div class="summary-card">
                    <h3>Execution Time</h3>
                    <div class="value neutral">{execution_time}</div>
                </div>
                <div class="summary-card">
                    <h3>Device</h3>
                    <div class="value neutral">{device_name}</div>
                </div>
                <div class="summary-card">
                    <h3>Host</h3>
                    <div class="value neutral">{host_name}</div>
                </div>
                <div class="summary-card">
                    <h3>Steps Passed</h3>
                    <div class="value success">{passed_steps}/{total_steps}</div>
                </div>
                <div class="summary-card">
                    <h3>Steps Failed</h3>
                    <div class="value failure">{failed_steps}</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>Initial & Final State</h2>
                <div class="screenshots-grid">
                    {initial_screenshot}
                    {final_screenshot}
                </div>
            </div>
            
            <div class="section">
                <h2>Step-by-Step Results</h2>
                {step_results_html}
            </div>
            
            {error_section}
        </div>
    </div>
</body>
</html>"""

def create_step_results_section(step_results: List[Dict], screenshots: Dict) -> str:
    """Create HTML for step-by-step results."""
    if not step_results:
        return '<p>No steps executed</p>'
    
    steps_html = []
    step_screenshots = screenshots.get('steps', [])
    
    for i, step in enumerate(step_results):
        step_number = step.get('step_number', i + 1)
        success = step.get('success', False)
        message = step.get('message', 'No message')
        
        # Get corresponding screenshot
        screenshot_html = ''
        if i < len(step_screenshots) and step_screenshots[i]:
            screenshot_html = get_screenshot_html(step_screenshots[i], f"Step {step_number} Result")
        
        step_html = f"""
        <div class="step {'success' if success else 'failure'}">
            <div class="step-header">
                <div class="step-title">Step {step_number}</div>
                <div class="step-status {'success' if success else 'failure'}">
                    {'PASS' if success else 'FAIL'}
                </div>
            </div>
            <div class="step-message">{message}</div>
            {screenshot_html}
        </div>
        """
        steps_html.append(step_html)
    
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

def get_screenshot_html(screenshot_path: Optional[str], label: str = None) -> str:
    """Get HTML for displaying a screenshot."""
    if not screenshot_path or not os.path.exists(screenshot_path):
        return ''
    
    try:
        # Convert screenshot to base64 for embedding
        with open(screenshot_path, 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
        
        label_html = f'<span class="screenshot-label">{label}</span>' if label else ''
        
        return f"""
        <div class="screenshot-container">
            {label_html}
            <img src="data:image/jpeg;base64,{img_data}" alt="{label or 'Screenshot'}" class="screenshot">
        </div>
        """
    except Exception as e:
        print(f"[@utils:report_utils:get_screenshot_html] Error embedding screenshot {screenshot_path}: {e}")
        return ''

def format_timestamp(timestamp: str) -> str:
    """Format timestamp for display."""
    try:
        # Convert YYYYMMDDHHMMSS to readable format
        dt = datetime.strptime(timestamp, '%Y%m%d%H%M%S')
        return dt.strftime('%B %d, %Y at %I:%M:%S %p')
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