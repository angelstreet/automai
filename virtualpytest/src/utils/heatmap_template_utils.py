"""
Heatmap Template Utilities

Minimal HTML template for heatmap display with embedded CSS.
"""

def create_heatmap_html_template() -> str:
    """Create comprehensive heatmap HTML template that looks like the heatmap page."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Heatmap Report - {timeframe}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa; color: #333; padding: 20px;
        }}
        .container {{ max-width: 1400px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #4a90e2, #357abd); color: white; padding: 20px; }}
        .header h1 {{ font-size: 1.8em; margin-bottom: 8px; }}
        .header .info {{ opacity: 0.9; font-size: 0.9em; display: flex; justify-content: space-between; align-items: center; }}
        .stats {{ display: flex; gap: 20px; }}
        .stat {{ display: flex; flex-direction: column; align-items: center; }}
        .stat-value {{ font-size: 1.2em; font-weight: bold; }}
        .stat-label {{ font-size: 0.8em; opacity: 0.8; }}
        
        .mosaic-player {{ padding: 20px; }}
        .mosaic-container {{ 
            width: 90%; height: 50vh; margin: 0 auto; position: relative; 
            background: black; border-radius: 8px; overflow: hidden;
            display: flex; align-items: center; justify-content: center;
        }}
        .mosaic-img {{ max-width: 100%; max-height: 100%; object-fit: contain; }}
        
        .timeline-controls {{ 
            margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.05); 
            border-radius: 8px; display: flex; align-items: center; gap: 15px;
        }}
        .play-btn {{ 
            background: #4a90e2; color: white; border: none; border-radius: 50%; 
            width: 40px; height: 40px; cursor: pointer; font-size: 16px;
        }}
        .timeline {{ flex: 1; position: relative; }}
        .timeline-slider {{ width: 100%; -webkit-appearance: none; height: 6px; background: #ddd; border-radius: 3px; }}
        .timeline-slider::-webkit-slider-thumb {{ 
            -webkit-appearance: none; width: 16px; height: 16px; background: #4a90e2; 
            border-radius: 50%; cursor: pointer;
        }}
        .timeline-ticks {{ position: absolute; top: -15px; left: 0; right: 0; height: 12px; }}
        .timeline-tick {{ 
            position: absolute; width: 3px; height: 12px; border-radius: 1px; 
            transform: translateX(-50%); cursor: pointer;
        }}
        .timeline-tick.incident {{ background: #ff0000; }}
        .timeline-tick.normal {{ background: #00ff00; }}
        .frame-counter {{ font-size: 0.9em; min-width: 60px; text-align: right; }}
        
        .analysis-section {{ padding: 20px; }}
        .analysis-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }}
        .analysis-item {{ background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #4a90e2; }}
        .analysis-item.error {{ border-left-color: #dc3545; }}
        .analysis-item h3 {{ font-size: 1em; margin-bottom: 8px; color: #555; }}
        .analysis-data {{ font-size: 0.9em; }}
        .analysis-data div {{ margin: 2px 0; }}
        
        .modal {{ display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); }}
        .modal.active {{ display: flex; justify-content: center; align-items: center; }}
        .modal img {{ max-width: 95%; max-height: 95%; }}
        .modal .close {{ position: absolute; top: 20px; right: 30px; color: white; font-size: 40px; cursor: pointer; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Heatmap Analysis Report</h1>
            <div class="info">
                <div>Generated: {generated_at}</div>
                <div class="stats">
                    <div class="stat">
                        <div class="stat-value">{total_devices}</div>
                        <div class="stat-label">Devices</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">{total_timestamps}</div>
                        <div class="stat-label">Timestamps</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">{incidents_count}</div>
                        <div class="stat-label">Incidents</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mosaic-player">
            <div class="mosaic-container">
                <img id="currentMosaic" src="{first_mosaic_url}" alt="Heatmap Mosaic" class="mosaic-img" onclick="openModal()">
            </div>
            
            <div class="timeline-controls">
                <button id="playBtn" class="play-btn" onclick="togglePlay()">▶</button>
                <div class="timeline">
                    <input type="range" id="timelineSlider" class="timeline-slider" min="0" max="{max_frame}" value="0" oninput="changeFrame(this.value)">
                    <div class="timeline-ticks">
                        {timeline_ticks}
                    </div>
                </div>
                <div id="frameCounter" class="frame-counter">1 / {total_timestamps}</div>
            </div>
        </div>
        
        <div class="analysis-section">
            <h2>Device Analysis</h2>
            <div id="currentAnalysis" class="analysis-grid">
                {first_analysis_items}
            </div>
        </div>
    </div>
    
    <div id="modal" class="modal" onclick="closeModal()">
        <span class="close">&times;</span>
        <img id="modalImg" src="{first_mosaic_url}" alt="Heatmap Mosaic">
    </div>

    <script>
        // Data for all timestamps
        const mosaicData = {mosaic_data_json};
        let currentFrame = 0;
        let isPlaying = false;
        let playInterval = null;
        
        function changeFrame(frameIndex) {{
            currentFrame = parseInt(frameIndex);
            const data = mosaicData[currentFrame];
            
            // Update mosaic image
            document.getElementById('currentMosaic').src = data.mosaic_url;
            document.getElementById('modalImg').src = data.mosaic_url;
            
            // Update frame counter
            document.getElementById('frameCounter').textContent = `${{currentFrame + 1}} / ${{mosaicData.length}}`;
            
            // Update analysis
            document.getElementById('currentAnalysis').innerHTML = data.analysis_html;
        }}
        
        function togglePlay() {{
            isPlaying = !isPlaying;
            const btn = document.getElementById('playBtn');
            
            if (isPlaying) {{
                btn.textContent = '⏸';
                playInterval = setInterval(() => {{
                    currentFrame = (currentFrame + 1) % mosaicData.length;
                    document.getElementById('timelineSlider').value = currentFrame;
                    changeFrame(currentFrame);
                }}, 1000);
            }} else {{
                btn.textContent = '▶';
                clearInterval(playInterval);
            }}
        }}
        
        function openModal() {{ document.getElementById('modal').classList.add('active'); }}
        function closeModal() {{ document.getElementById('modal').classList.remove('active'); }}
    </script>
</body>
</html>""" 