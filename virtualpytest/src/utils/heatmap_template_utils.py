"""
Heatmap Template Utilities

Minimal HTML template for heatmap display with embedded CSS.
"""

def create_heatmap_html_template() -> str:
    """Create minimal heatmap HTML template."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Heatmap - {timestamp}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa; color: #333; padding: 20px;
        }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #4a90e2, #357abd); color: white; padding: 20px; text-align: center; }}
        .header h1 {{ font-size: 1.8em; margin-bottom: 8px; }}
        .header .info {{ opacity: 0.9; font-size: 0.9em; }}
        .mosaic-section {{ padding: 20px; text-align: center; }}
        .mosaic-img {{ max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; }}
        .analysis-section {{ padding: 0 20px 20px; }}
        .analysis-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }}
        .analysis-item {{ background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #4a90e2; }}
        .analysis-item.error {{ border-left-color: #dc3545; }}
        .analysis-item h3 {{ font-size: 1em; margin-bottom: 8px; color: #555; }}
        .analysis-data {{ font-size: 0.9em; }}
        .incidents-section {{ padding: 0 20px 20px; }}
        .incident {{ background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 4px; }}
        .modal {{ display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); }}
        .modal.active {{ display: flex; justify-content: center; align-items: center; }}
        .modal img {{ max-width: 95%; max-height: 95%; }}
        .modal .close {{ position: absolute; top: 20px; right: 30px; color: white; font-size: 40px; cursor: pointer; }}
    </style>
    <script>
        function openModal() {{ document.getElementById('modal').classList.add('active'); }}
        function closeModal() {{ document.getElementById('modal').classList.remove('active'); }}
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Heatmap Analysis</h1>
            <div class="info">Timestamp: {timestamp} | Generated: {generated_at}</div>
        </div>
        
        <div class="mosaic-section">
            <img src="{mosaic_url}" alt="Heatmap Mosaic" class="mosaic-img" onclick="openModal()">
        </div>
        
        <div class="analysis-section">
            <h2 style="margin-bottom: 15px;">Device Analysis</h2>
            <div class="analysis-grid">
                {analysis_items}
            </div>
        </div>
        
        {incidents_section}
    </div>
    
    <div id="modal" class="modal" onclick="closeModal()">
        <span class="close">&times;</span>
        <img src="{mosaic_url}" alt="Heatmap Mosaic">
    </div>
</body>
</html>""" 