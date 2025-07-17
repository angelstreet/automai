"""
Report Template Utilities

This module contains the HTML template for validation reports with embedded CSS and JavaScript.
Separated from main report_utils.py for better maintainability.
"""

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
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 20px;
            padding: 2px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
        }}
        
        .theme-toggle:hover {{
            background: rgba(255,255,255,0.2);
        }}
        
        .theme-option {{
            padding: 4px 10px;
            border-radius: 16px;
            font-size: 0.75em;
            font-weight: 500;
            transition: all 0.2s ease;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: relative;
            z-index: 2;
        }}
        
        .theme-option.active {{
            background: rgba(255,255,255,0.9);
            color: #1976d2;
        }}
        
        .theme-slider {{
            position: absolute;
            top: 2px;
            left: 2px;
            width: calc(33.33% - 2px);
            height: calc(100% - 4px);
            background: rgba(255,255,255,0.9);
            border-radius: 16px;
            transition: transform 0.2s ease;
            z-index: 1;
        }}
        
        .theme-slider.light {{
            transform: translateX(0);
        }}
        
        .theme-slider.dark {{
            transform: translateX(100%);
        }}
        
        .theme-slider.system {{
            transform: translateX(200%);
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
        
        .steps-expanded {{
            max-height: 2000px;
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
        
        .step-timing-inline {{
            font-size: 0.8em;
            color: var(--text-secondary);
            margin-left: 10px;
            white-space: nowrap;
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
        
        .step-details-content {{
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 15px;
            align-items: start;
        }}
        
        .step-info {{
            display: flex;
            flex-direction: column;
            gap: 8px;
        }}
        
        .step-timing {{
            display: flex;
            gap: 15px;
            font-size: 0.85em;
            color: var(--text-secondary);
        }}
        
        .step-actions {{
            font-size: 0.9em;
        }}
        
        .step-actions strong {{
            color: var(--text-primary);
        }}
        
        .action-item, .verification-item {{
            margin: 4px 0;
            padding: 4px 8px;
            background: var(--bg-secondary);
            border-radius: 4px;
            border-left: 3px solid var(--border-color);
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
        }}
        
        .action-item {{
            border-left-color: #17a2b8;
        }}
        
        .verification-item {{
            border-left-color: #6f42c1;
        }}
        
        .step-screenshot-container {{
            text-align: right;
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
            display: none;
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
                 margin-bottom: 8px;
             }}
             
             .step-details-content {{
                 grid-template-columns: 1fr;
                 gap: 10px;
             }}
             
             .step-screenshot-container {{
                 text-align: center;
             }}
             
             .step-timing-inline {{
                 display: block;
                 margin-top: 5px;
                 margin-left: 0;
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
                this.updateSlider();
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
                const themeOptions = document.querySelectorAll('.theme-option');
                themeOptions.forEach(option => {{
                    option.classList.toggle('active', option.dataset.theme === this.currentMode);
                }});
            }}
            
            updateSlider() {{
                const slider = document.querySelector('.theme-slider');
                if (slider) {{
                    slider.className = `theme-slider ${{this.currentMode}}`;
                }}
            }}
        }}
        
        // Initialize theme manager when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {{
            window.themeManager = new ThemeManager();
        }});
        
        function toggleSection(sectionId) {{
            const content = document.getElementById(sectionId);
            const button = document.querySelector(`[onclick="toggleSection('${{sectionId}}')"] .toggle-btn`);
            
            if (content.classList.contains('expanded')) {{
                content.classList.remove('expanded');
                button.classList.remove('expanded');
                button.textContent = '▶';
            }} else {{
                content.classList.add('expanded');
                button.classList.add('expanded');
                button.textContent = '▼';
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
            <div class="header-left">
                <h1>{script_name}</h1>
                <div class="time-info">
                    Start: {start_time} | End: {end_time}
                </div>
            </div>
            <div class="theme-toggle">
                <div class="theme-slider light"></div>
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
                    <button class="toggle-btn expanded">▼</button>
                </div>
                <div id="steps-content" class="collapsible-content steps-expanded">
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