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
            start_end_time=f"{format_timestamp(start_time)} - {format_timestamp(end_time)}",
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
            initial_screenshot=get_thumbnail_screenshot_html(screenshots.get('initial'), hide_label=True),
            final_screenshot=get_thumbnail_screenshot_html(screenshots.get('final'), hide_label=True)
        )
        
        print(f"[@utils:report_utils:generate_validation_report] Report generated successfully")
        return html_content
        
    except Exception as e:
        print(f"[@utils:report_utils:generate_validation_report] Error: {str(e)}")
        return create_error_report(str(e))

def create_themed_html_template() -> str:
    """Create the themed HTML template with embedded CSS and theme system."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validation Report - {script_name}</title>
    <style>
        :root {{
            /* Light theme variables */
            --bg-primary: #f8f9fa;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f8f9fa;
            --text-primary: #333333;
            --text-secondary: #6c757d;
            --border-color: #dee2e6;
            --border-light: #e9ecef;
            --shadow: 0 1px 3px rgba(0,0,0,0.1);
            --shadow-hover: 0 2px 8px rgba(0,0,0,0.15);
            --success-color: #28a745;
            --success-bg: #d4edda;
            --success-text: #155724;
            --failure-color: #dc3545;
            --failure-bg: #f8d7da;
            --failure-text: #721c24;
            --header-bg: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
            --step-hover: #f8f9fa;
            --error-bg: #f8d7da;
            --error-border: #f5c6cb;
            --modal-bg: rgba(0,0,0,0.8);
        }}
        
        [data-theme="dark"] {{
            /* Dark theme variables */
            --bg-primary: #0a0a0a;
            --bg-secondary: #1a1a1a;
            --bg-tertiary: #2a2a2a;
            --text-primary: #ffffff;
            --text-secondary: #a0a0a0;
            --border-color: #404040;
            --border-light: #303030;
            --shadow: 0 4px 6px rgba(0,0,0,0.3);
            --shadow-hover: 0 8px 16px rgba(0,0,0,0.4);
            --success-color: #4ade80;
            --success-bg: #1a4a2a;
            --success-text: #86efac;
            --failure-color: #f87171;
            --failure-bg: #4a1a1a;
            --failure-text: #fca5a5;
            --header-bg: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
            --step-hover: #2a2a2a;
            --error-bg: #4a1a1a;
            --error-border: #6b2c2c;
            --modal-bg: rgba(0,0,0,0.9);
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.4;
            color: var(--text-primary);
            background: var(--bg-primary);
            padding: 10px;
            font-size: 14px;
            transition: background-color 0.3s ease, color 0.3s ease;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: var(--bg-secondary);
            border-radius: 6px;
            box-shadow: var(--shadow);
            overflow: hidden;
            transition: background-color 0.3s ease, box-shadow 0.3s ease;
        }}
        
        .header {{
            background: var(--header-bg);
            color: white;
            padding: 8px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-height: 40px;
        }}
        
        .header-left {{
            display: flex;
            align-items: center;
            gap: 15px;
        }}
        
        .header h1 {{
            font-size: 1.4em;
            font-weight: 600;
        }}
        
        .header .time-info {{
            font-size: 0.85em;
            opacity: 0.9;
            white-space: nowrap;
        }}
        
        .theme-toggle {{
            display: flex;
            align-items: center;
            background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 20px;
            padding: 2px;
            position: relative;
            min-width: 120px;
        }}
        
        .theme-option {{
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 0.75em;
            font-weight: 500;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.2s ease;
            flex: 1;
            text-align: center;
            position: relative;
            z-index: 2;
        }}
        
        .theme-slider {{
            position: absolute;
            top: 2px;
            left: 2px;
            width: calc(33.333% - 2px);
            height: calc(100% - 4px);
            background: rgba(255,255,255,0.9);
            border-radius: 16px;
            transition: transform 0.3s ease;
            z-index: 1;
        }}
        
        .theme-slider.dark {{
            transform: translateX(100%);
        }}
        
        .theme-slider.system {{
            transform: translateX(200%);
        }}
        
        .theme-option.active {{
            color: #1976d2;
            font-weight: 600;
        }}
        
        .summary {{
            padding: 12px 20px;
            background: var(--bg-tertiary);
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.3s ease, border-color 0.3s ease;
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
            background: var(--bg-secondary);
            border-radius: 4px;
            border: 1px solid var(--border-light);
            font-size: 0.9em;
            transition: all 0.3s ease;
        }}
        
        .summary-item .label {{
            color: var(--text-secondary);
            font-weight: 500;
        }}
        
        .summary-item .value {{
            font-weight: 600;
        }}
        
        .success {{
            color: var(--success-color);
        }}
        
        .failure {{
            color: var(--failure-color);
        }}
        
        .neutral {{
            color: var(--text-secondary);
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
            border-bottom: 1px solid var(--border-light);
            transition: border-color 0.3s ease;
        }}
        
        .section-header h2 {{
            color: var(--text-primary);
            font-size: 1.1em;
            font-weight: 600;
        }}
        
        .toggle-btn {{
            background: none;
            border: none;
            font-size: 1.2em;
            cursor: pointer;
            color: var(--text-secondary);
            transition: transform 0.2s, color 0.3s ease;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
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
            max-height: 3000px;
        }}
        
        .step-list {{
            border: 1px solid var(--border-light);
            border-radius: 4px;
            overflow: hidden;
            transition: border-color 0.3s ease;
        }}
        
        .step-item {{
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid var(--border-light);
            cursor: pointer;
            transition: background-color 0.2s, border-color 0.3s ease;
        }}
        
        .step-item:last-child {{
            border-bottom: none;
        }}
        
        .step-item:hover {{
            background: var(--step-hover);
        }}
        
        .step-item.success {{
            border-left: 3px solid var(--success-color);
        }}
        
        .step-item.failure {{
            border-left: 3px solid var(--failure-color);
        }}
        
        .step-number {{
            width: 30px;
            font-weight: 600;
            color: var(--text-secondary);
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
            transition: all 0.3s ease;
        }}
        
        .step-status-badge.success {{
            background: var(--success-bg);
            color: var(--success-text);
        }}
        
        .step-status-badge.failure {{
            background: var(--failure-bg);
            color: var(--failure-text);
        }}
        
        .step-message {{
            flex: 1;
            padding-left: 12px;
            font-size: 0.9em;
        }}
        
        .step-details {{
            display: none;
            padding: 12px;
            background: var(--bg-tertiary);
            border-top: 1px solid var(--border-light);
            transition: all 0.3s ease;
        }}
        
        .step-details.expanded {{
            display: block;
        }}
        
        .step-details-grid {{
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 20px;
            align-items: start;
        }}
        
        .step-info {{
            font-size: 0.85em;
            line-height: 1.5;
        }}
        
        .step-info-row {{
            display: flex;
            margin-bottom: 6px;
        }}
        
        .step-info-label {{
            font-weight: 600;
            color: var(--text-secondary);
            min-width: 100px;
        }}
        
        .step-info-value {{
            color: var(--text-primary);
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
        
        .screenshot-container.no-label {{
            margin: 0;
        }}
        
        .screenshot-label {{
            display: block;
            color: var(--text-secondary);
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
            border: 2px solid var(--border-color);
            cursor: pointer;
            transition: all 0.2s;
        }}
        
        .screenshot-thumbnail:hover {{
            border-color: #4a90e2;
            transform: scale(1.02);
            box-shadow: var(--shadow-hover);
        }}
        
        .screenshot-right {{
            max-width: 150px;
            height: 90px;
            border-radius: 4px;
            border: 2px solid var(--border-color);
            cursor: pointer;
            transition: all 0.2s;
            object-fit: cover;
        }}
        
        .screenshot-right:hover {{
            border-color: #4a90e2;
            transform: scale(1.05);
        }}
        
        .screenshot-modal {{
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: var(--modal-bg);
            transition: background-color 0.3s ease;
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
            background: var(--error-bg);
            border: 1px solid var(--error-border);
            border-radius: 4px;
            padding: 12px;
            margin-top: 15px;
            transition: all 0.3s ease;
        }}
        
        .error-section h3 {{
            color: var(--failure-text);
            margin-bottom: 8px;
            font-size: 1em;
        }}
        
        .error-message {{
            font-family: 'Courier New', monospace;
            background: var(--bg-secondary);
            padding: 10px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            white-space: pre-wrap;
            overflow-x: auto;
            font-size: 0.85em;
            transition: all 0.3s ease;
        }}
        
        @media (max-width: 768px) {{
            .summary-grid {{
                grid-template-columns: 1fr;
            }}
            
            .screenshot-grid {{
                grid-template-columns: 1fr;
            }}
            
            .step-details-grid {{
                grid-template-columns: 1fr;
                gap: 10px;
            }}
            
            .header {{
                flex-direction: column;
                gap: 8px;
                text-align: center;
                padding: 12px 20px;
            }}
            
            .header-left {{
                flex-direction: column;
                gap: 8px;
            }}
            
            .theme-toggle {{
                order: -1;
                min-width: 150px;
            }}
        }}
    </style>
    <script>
        // Theme management system
        class ThemeManager {{
            constructor() {{
                this.currentMode = this.getSavedTheme() || 'system';
                this.systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                this.init();
            }}
            
            init() {{
                this.applyTheme();
                this.setupSystemThemeListener();
                this.setupThemeToggle();
            }}
            
            getSavedTheme() {{
                return localStorage.getItem('validation-report-theme');
            }}
            
            saveTheme(mode) {{
                localStorage.setItem('validation-report-theme', mode);
            }}
            
            getActualTheme() {{
                if (this.currentMode === 'system') {{
                    return this.systemPrefersDark ? 'dark' : 'light';
                }}
                return this.currentMode;
            }}
            
            applyTheme() {{
                const actualTheme = this.getActualTheme();
                document.documentElement.setAttribute('data-theme', actualTheme);
                this.updateToggleButtons();
            }}
            
            setTheme(mode) {{
                this.currentMode = mode;
                this.saveTheme(mode);
                this.applyTheme();
            }}
            
            setupSystemThemeListener() {{
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                mediaQuery.addEventListener('change', (e) => {{
                    this.systemPrefersDark = e.matches;
                    if (this.currentMode === 'system') {{
                        this.applyTheme();
                    }}
                }});
            }}
            
            setupThemeToggle() {{
                const themeOptions = document.querySelectorAll('.theme-option');
                themeOptions.forEach(option => {{
                    option.addEventListener('click', (e) => {{
                        const mode = e.target.dataset.theme;
                        this.setTheme(mode);
                    }});
                }});
            }}
            
            updateToggleButtons() {{
                const slider = document.querySelector('.theme-slider');
                const themeOptions = document.querySelectorAll('.theme-option');
                
                if (slider) {{
                    slider.className = 'theme-slider ' + this.currentMode;
                }}
                
                themeOptions.forEach(option => {{
                    option.classList.toggle('active', option.dataset.theme === this.currentMode);
                }});
            }}
        }}
        
        function toggleSection(sectionId) {{
            const content = document.getElementById(sectionId);
            const button = document.querySelector(`[onclick="toggleSection('${{sectionId}}')"]`);
            
            if (content && button) {{
                if (content.classList.contains('expanded')) {{
                    content.classList.remove('expanded');
                    button.classList.remove('expanded');
                }} else {{
                    content.classList.add('expanded');
                    button.classList.add('expanded');
                }}
            }}
        }}
        
        function toggleStep(stepId) {{
            const details = document.getElementById(stepId);
            if (details) {{
                if (details.classList.contains('expanded')) {{
                    details.classList.remove('expanded');
                }} else {{
                    details.classList.add('expanded');
                }}
            }}
        }}
        
        function openScreenshot(src) {{
            const modal = document.getElementById('screenshot-modal');
            const img = document.getElementById('modal-img');
            if (modal && img) {{
                img.src = src;
                modal.classList.add('active');
            }}
        }}
        
        function closeScreenshot() {{
            const modal = document.getElementById('screenshot-modal');
            if (modal) {{
                modal.classList.remove('active');
            }}
        }}
        
        // Initialize everything when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {{
            // Initialize theme manager
            window.themeManager = new ThemeManager();
            
            // Expand Test Steps by default
            const stepsContent = document.getElementById('steps-content');
            const stepsButton = document.querySelector("[onclick=\"toggleSection('steps-content')\"]");
            if (stepsContent && stepsButton) {{
                stepsContent.classList.add('expanded');
                stepsButton.classList.add('expanded');
            }}
            
            // Close modal when clicking outside the image
            const modal = document.getElementById('screenshot-modal');
            if (modal) {{
                modal.addEventListener('click', function(e) {{
                    if (e.target === modal) {{
                        closeScreenshot();
                    }}
                }});
            }}
            
            // Close modal with Escape key
            document.addEventListener('keydown', function(e) {{
                if (e.key === 'Escape') {{
                    closeScreenshot();
                }}
            }});
        }});
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <h1>{script_name}</h1>
                <div class="time-info">{start_end_time}</div>
            </div>
            <div class="theme-toggle">
                <div class="theme-slider"></div>
                <div class="theme-option" data-theme="light">Light</div>
                <div class="theme-option" data-theme="dark">Dark</div>
                <div class="theme-option" data-theme="system">System</div>
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
                    <button class="toggle-btn">▼</button>
                </div>
                <div id="steps-content" class="collapsible-content expanded">
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
    """Create HTML for compact step-by-step results with detailed information."""
    if not step_results:
        return '<p>No steps executed</p>'
    
    steps_html = ['<div class="step-list">']
    step_screenshots = screenshots.get('steps', [])
    
    for i, step in enumerate(step_results):
        step_number = step.get('step_number', i + 1)
        success = step.get('success', False)
        message = step.get('message', 'No message')
        execution_time = step.get('execution_time_ms', 0)
        from_node = step.get('from_node', 'Unknown')
        to_node = step.get('to_node', 'Unknown')
        
        # Get corresponding screenshot
        screenshot_html = ''
        if i < len(step_screenshots) and step_screenshots[i]:
            screenshot_html = get_step_screenshot_html(step_screenshots[i])
        
        # Create detailed step information
        step_details = f"""
        <div class="step-details-grid">
            <div class="step-info">
                <div class="step-info-row">
                    <span class="step-info-label">Transition:</span>
                    <span class="step-info-value">{from_node} → {to_node}</span>
                </div>
                <div class="step-info-row">
                    <span class="step-info-label">Execution Time:</span>
                    <span class="step-info-value">{format_execution_time(execution_time)}</span>
                </div>
                <div class="step-info-row">
                    <span class="step-info-label">Result:</span>
                    <span class="step-info-value {'success' if success else 'failure'}">{'SUCCESS' if success else 'FAILED'}</span>
                </div>
                <div class="step-info-row">
                    <span class="step-info-label">Actions:</span>
                    <span class="step-info-value">Navigation step executed</span>
                </div>
                <div class="step-info-row">
                    <span class="step-info-label">Verifications:</span>
                    <span class="step-info-value">Target node verification completed</span>
                </div>
            </div>
            {screenshot_html}
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
            <div class="step-message">{message}</div>
        </div>
        <div id="step-details-{i}" class="step-details">
            {step_details}
        </div>
        """
        steps_html.append(step_html)
    
    steps_html.append('</div>')
    return ''.join(steps_html)

def get_step_screenshot_html(screenshot_path: str) -> str:
    """Get HTML for step screenshot aligned to the right."""
    if not screenshot_path or not os.path.exists(screenshot_path):
        return ''
    
    try:
        with open(screenshot_path, 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
        
        data_url = f"data:image/jpeg;base64,{img_data}"
        
        return f"""
        <div>
            <img src="{data_url}" alt="Step Screenshot" class="screenshot-right" onclick="openScreenshot('{data_url}')">
        </div>
        """
    except Exception as e:
        print(f"[@utils:report_utils:get_step_screenshot_html] Error embedding screenshot {screenshot_path}: {e}")
        return ''

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

def get_thumbnail_screenshot_html(screenshot_path: Optional[str], label: str = None, hide_label: bool = False) -> str:
    """Get HTML for displaying a thumbnail screenshot that expands on click."""
    if not screenshot_path or not os.path.exists(screenshot_path):
        return ''
    
    try:
        # Convert screenshot to base64 for embedding
        with open(screenshot_path, 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
        
        data_url = f"data:image/jpeg;base64,{img_data}"
        
        label_html = ''
        container_class = 'screenshot-container'
        
        if not hide_label and label:
            label_html = f'<span class="screenshot-label">{label}</span>'
        else:
            container_class += ' no-label'
        
        return f"""
        <div class="{container_class}">
            {label_html}
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