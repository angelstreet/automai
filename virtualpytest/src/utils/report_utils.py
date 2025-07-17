"""
Report Generation Utilities

This module provides functions for generating HTML validation reports with embedded screenshots.
Reports include execution metrics, step-by-step results, and error analysis.
Enhanced for manager-friendly compact view with collapsible sections.
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
        start_time = report_data.get('start_time', timestamp)
        end_time = report_data.get('end_time', timestamp)
        
        # Calculate stats
        total_steps = len(step_results)
        passed_steps = sum(1 for step in step_results if step.get('success', False))
        failed_steps = total_steps - passed_steps
        
        # Generate HTML content
        html_template = create_compact_html_template()
        
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
            initial_screenshot=get_thumbnail_screenshot_html(screenshots.get('initial'), 'Initial State'),
            final_screenshot=get_thumbnail_screenshot_html(screenshots.get('final'), 'Final State')
        )
        
        print(f"[@utils:report_utils:generate_validation_report] Report generated successfully")
        return html_content
        
    except Exception as e:
        print(f"[@utils:report_utils:generate_validation_report] Error: {str(e)}")
        return create_error_report(str(e))

def create_compact_html_template() -> str:
    """Create the compact HTML template with embedded CSS."""
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
            line-height: 1.4;
            color: #333;
            background: #f8f9fa;
            padding: 10px;
            font-size: 14px;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
            color: white;
            padding: 8px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-height: 40px;
        }}
        
        .header h1 {{
            font-size: 1.4em;
            font-weight: 600;
        }}
        
        .header .time-info {{
            font-size: 0.85em;
            opacity: 0.9;
        }}
        
        .summary {{
            padding: 12px 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }}
        
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 8px;
            align-items: center;
        }}
        
        .summary-item {{
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: white;
            border-radius: 4px;
            border: 1px solid #e9ecef;
            font-size: 0.9em;
        }}
        
        .summary-item .label {{
            color: #6c757d;
            font-weight: 500;
        }}
        
        .summary-item .value {{
            font-weight: 600;
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
            padding: 15px 20px;
        }}
        
        .section {{
            margin-bottom: 20px;
        }}
        
        .section-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            cursor: pointer;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }}
        
        .section-header h2 {{
            color: #495057;
            font-size: 1.1em;
            font-weight: 600;
        }}
        
        .toggle-btn {{
            background: none;
            border: none;
            font-size: 1.2em;
            cursor: pointer;
            color: #6c757d;
            transition: transform 0.2s;
        }}
        
        .toggle-btn.expanded {{
            transform: rotate(90deg);
        }}
        
        .collapsible-content {{
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }}
        
        .collapsible-content.expanded {{
            max-height: 2000px;
        }}
        
        .step-list {{
            border: 1px solid #e9ecef;
            border-radius: 4px;
            overflow: hidden;
        }}
        
        .step-item {{
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid #f1f3f4;
            cursor: pointer;
            transition: background-color 0.2s;
        }}
        
        .step-item:last-child {{
            border-bottom: none;
        }}
        
        .step-item:hover {{
            background: #f8f9fa;
        }}
        
        .step-item.success {{
            border-left: 3px solid #28a745;
        }}
        
        .step-item.failure {{
            border-left: 3px solid #dc3545;
        }}
        
        .step-number {{
            width: 30px;
            font-weight: 600;
            color: #6c757d;
            font-size: 0.9em;
        }}
        
        .step-status {{
            width: 50px;
            text-align: center;
        }}
        
        .step-status-badge {{
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 600;
            text-transform: uppercase;
        }}
        
        .step-status-badge.success {{
            background: #d4edda;
            color: #155724;
        }}
        
        .step-status-badge.failure {{
            background: #f8d7da;
            color: #721c24;
        }}
        
        .step-message {{
            flex: 1;
            padding-left: 12px;
            font-size: 0.9em;
        }}
        
        .step-details {{
            display: none;
            padding: 12px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
        }}
        
        .step-details.expanded {{
            display: block;
        }}
        
        .screenshot-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 10px;
        }}
        
        .screenshot-container {{
            text-align: center;
        }}
        
        .screenshot-label {{
            display: block;
            color: #6c757d;
            font-size: 0.85em;
            margin-bottom: 8px;
            font-weight: 500;
        }}
        
        .screenshot-thumbnail {{
            width: 100%;
            max-width: 200px;
            height: 120px;
            object-fit: cover;
            border-radius: 4px;
            border: 2px solid #dee2e6;
            cursor: pointer;
            transition: all 0.2s;
        }}
        
        .screenshot-thumbnail:hover {{
            border-color: #4a90e2;
            transform: scale(1.02);
        }}
        
        .screenshot-modal {{
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
        }}
        
        .screenshot-modal.active {{
            display: flex;
            justify-content: center;
            align-items: center;
        }}
        
        .screenshot-modal img {{
            max-width: 90%;
            max-height: 90%;
            border-radius: 4px;
        }}
        
        .screenshot-modal .close {{
            position: absolute;
            top: 20px;
            right: 30px;
            color: white;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }}
        
        .error-section {{
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            padding: 12px;
            margin-top: 15px;
        }}
        
        .error-section h3 {{
            color: #721c24;
            margin-bottom: 8px;
            font-size: 1em;
        }}
        
        .error-message {{
            font-family: 'Courier New', monospace;
            background: #fff;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #dee2e6;
            white-space: pre-wrap;
            overflow-x: auto;
            font-size: 0.85em;
        }}
        
        @media (max-width: 768px) {{
            .summary-grid {{
                grid-template-columns: 1fr;
            }}
            
            .screenshot-grid {{
                grid-template-columns: 1fr;
            }}
            
            .header {{
                flex-direction: column;
                gap: 5px;
                text-align: center;
            }}
        }}
    </style>
    <script>
        function toggleSection(sectionId) {{
            const content = document.getElementById(sectionId);
            const button = document.querySelector(`[onclick="toggleSection('${{sectionId}}')"]`);
            
            if (content.classList.contains('expanded')) {{
                content.classList.remove('expanded');
                button.classList.remove('expanded');
            }} else {{
                content.classList.add('expanded');
                button.classList.add('expanded');
            }}
        }}
        
        function toggleStep(stepId) {{
            const details = document.getElementById(stepId);
            if (details.classList.contains('expanded')) {{
                details.classList.remove('expanded');
            }} else {{
                details.classList.add('expanded');
            }}
        }}
        
        function openScreenshot(src) {{
            const modal = document.getElementById('screenshot-modal');
            const img = document.getElementById('modal-img');
            img.src = src;
            modal.classList.add('active');
        }}
        
        function closeScreenshot() {{
            const modal = document.getElementById('screenshot-modal');
            modal.classList.remove('active');
        }}
        
        // Close modal when clicking outside the image
        document.addEventListener('DOMContentLoaded', function() {{
            const modal = document.getElementById('screenshot-modal');
            if (modal) {{
                modal.addEventListener('click', function(e) {{
                    if (e.target === modal) {{
                        closeScreenshot();
                    }}
                }});
            }}
        }});
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{script_name}</h1>
            <div class="time-info">
                <div>Start: {start_time}</div>
                <div>End: {end_time}</div>
            </div>
        </div>
        
        <div class="summary">
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="label">Status:</span>
                    <span class="value {success_class}">{success_status}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Duration:</span>
                    <span class="value neutral">{execution_time}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Device:</span>
                    <span class="value neutral">{device_name}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Host:</span>
                    <span class="value neutral">{host_name}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Steps:</span>
                    <span class="value neutral">{passed_steps}/{total_steps}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Failed:</span>
                    <span class="value failure">{failed_steps}</span>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-header" onclick="toggleSection('screenshots-content')">
                    <h2>Initial & Final State</h2>
                    <button class="toggle-btn">▶</button>
                </div>
                <div id="screenshots-content" class="collapsible-content">
                    <div class="screenshot-grid">
                        {initial_screenshot}
                        {final_screenshot}
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header" onclick="toggleSection('steps-content')">
                    <h2>Test Steps ({passed_steps}/{total_steps} passed)</h2>
                    <button class="toggle-btn">▶</button>
                </div>
                <div id="steps-content" class="collapsible-content">
                    {step_results_html}
                </div>
            </div>
            
            {error_section}
        </div>
    </div>
    
    <div id="screenshot-modal" class="screenshot-modal">
        <span class="close" onclick="closeScreenshot()">&times;</span>
        <img id="modal-img" src="" alt="Screenshot">
    </div>
</body>
</html>"""

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
        
        # Get corresponding screenshot
        screenshot_html = ''
        if i < len(step_screenshots) and step_screenshots[i]:
            screenshot_html = get_thumbnail_screenshot_html(step_screenshots[i], f"Step {step_number}")
        
        step_html = f"""
        <div class="step-item {'success' if success else 'failure'}" onclick="toggleStep('step-details-{i}')">
            <div class="step-number">{step_number}</div>
            <div class="step-status">
                <span class="step-status-badge {'success' if success else 'failure'}">
                    {'PASS' if success else 'FAIL'}
                </span>
            </div>
            <div class="step-message">{message}</div>
        </div>
        <div id="step-details-{i}" class="step-details">
            {screenshot_html}
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
            <img src="{data_url}" alt="{label or 'Screenshot'}" class="screenshot-thumbnail" onclick="openScreenshot('{data_url}')">
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