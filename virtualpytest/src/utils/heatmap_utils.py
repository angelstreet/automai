"""
Heatmap Utilities

This module provides server-side image processing functionality for creating
heatmap mosaics from host device captures with CPU limiting and R2 storage.
"""

import os
import json
import time
import uuid
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFont
import requests
import io

# Global state for job management
active_jobs = {}
job_lock = threading.Lock()

# CPU limiting configuration
MAX_WORKER_THREADS = 2  # Limit to 2 threads to keep CPU usage low
PROCESS_PRIORITY_LOW = True  # Set low process priority

class HeatmapJob:
    def __init__(self, job_id: str, timeframe_minutes: int = 1):
        self.job_id = job_id
        self.status = 'pending'  # pending, processing, completed, failed
        self.progress = 0  # 0-100
        self.timeframe_minutes = timeframe_minutes
        self.mosaic_urls = []
        self.error = None
        self.created_at = datetime.now()
        
    def to_dict(self):
        return {
            'job_id': self.job_id,
            'status': self.status,
            'progress': self.progress,
            'mosaic_urls': self.mosaic_urls,
            'error': self.error,
            'created_at': self.created_at.isoformat()
        }

def set_low_priority():
    """Set low process priority to limit CPU usage"""
    try:
        if PROCESS_PRIORITY_LOW:
            import psutil
            p = psutil.Process(os.getpid())
            if os.name == 'nt':  # Windows
                p.nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
            else:  # Unix/Linux
                p.nice(10)  # Lower priority (higher nice value)
    except ImportError:
        print("[@heatmap_utils] psutil not available, cannot set process priority")
    except Exception as e:
        print(f"[@heatmap_utils] Failed to set process priority: {e}")

def create_heatmap_job(timeframe_minutes: int = 1) -> str:
    """Create a new heatmap generation job"""
    job_id = str(uuid.uuid4())
    
    with job_lock:
        active_jobs[job_id] = HeatmapJob(job_id, timeframe_minutes)
    
    print(f"[@heatmap_utils] Created heatmap job: {job_id}")
    return job_id

def get_job_status(job_id: str) -> Optional[Dict]:
    """Get the status of a heatmap job"""
    with job_lock:
        job = active_jobs.get(job_id)
        if job:
            return job.to_dict()
    return None

def cancel_job(job_id: str) -> bool:
    """Cancel a heatmap generation job"""
    with job_lock:
        job = active_jobs.get(job_id)
        if job and job.status in ['pending', 'processing']:
            job.status = 'failed'
            job.error = 'Cancelled by user'
            print(f"[@heatmap_utils] Cancelled job: {job_id}")
            return True
    return False

def fetch_image_from_url(url: str, timeout: int = 10) -> Optional[Image.Image]:
    """Fetch image from URL with timeout"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            image = Image.open(io.BytesIO(response.content))
            return image
    except Exception as e:
        print(f"[@heatmap_utils] Failed to fetch image from {url}: {e}")
    return None

def add_border_to_image(image: Image.Image, border_color: str, border_width: int = 5) -> Image.Image:
    """Add colored border to image based on incident status"""
    # Create new image with border
    new_width = image.width + 2 * border_width
    new_height = image.height + 2 * border_width
    
    bordered_image = Image.new('RGB', (new_width, new_height), border_color)
    bordered_image.paste(image, (border_width, border_width))
    
    return bordered_image

def determine_border_color(image_data: Dict) -> str:
    """Determine border color based on analysis and incidents"""
    analysis = image_data.get('analysis_json', {})
    has_incidents = image_data.get('has_incidents', False)
    
    # Check for any incidents in analysis
    analysis_incidents = (
        analysis.get('blackscreen', False) or
        analysis.get('freeze', False) or
        analysis.get('audio_loss', False)
    )
    
    if analysis_incidents or has_incidents:
        return '#FF0000'  # Red for incidents
    else:
        return '#00FF00'  # Green for no incidents

def calculate_grid_layout(num_devices: int) -> Tuple[int, int]:
    """Calculate optimal grid layout for mosaic"""
    if num_devices <= 1:
        return (1, 1)
    elif num_devices <= 4:
        return (2, 2)
    elif num_devices <= 9:
        return (3, 3)
    elif num_devices <= 16:
        return (4, 4)
    elif num_devices <= 25:
        return (5, 5)
    else:
        # For larger numbers, try to keep aspect ratio reasonable
        import math
        cols = math.ceil(math.sqrt(num_devices))
        rows = math.ceil(num_devices / cols)
        return (cols, rows)

def create_mosaic_image(images_data: List[Dict], target_size: Tuple[int, int] = (1920, 1080)) -> Image.Image:
    """Create a mosaic image from multiple device images"""
    if not images_data:
        # Create empty mosaic
        return Image.new('RGB', target_size, (0, 0, 0))
    
    num_devices = len(images_data)
    cols, rows = calculate_grid_layout(num_devices)
    
    # Calculate cell size
    cell_width = target_size[0] // cols
    cell_height = target_size[1] // rows
    
    # Create mosaic canvas
    mosaic = Image.new('RGB', target_size, (0, 0, 0))
    
    for i, image_data in enumerate(images_data):
        if i >= cols * rows:
            break  # Don't exceed grid capacity
            
        # Calculate position
        col = i % cols
        row = i // cols
        x = col * cell_width
        y = row * cell_height
        
        # Fetch and process image
        image_url = image_data.get('image_url')
        if not image_url:
            continue
            
        device_image = fetch_image_from_url(image_url)
        if not device_image:
            continue
            
        # Resize image to fit cell (maintaining aspect ratio)
        device_image.thumbnail((cell_width - 10, cell_height - 10), Image.Resampling.LANCZOS)
        
        # Add border based on incident status
        border_color = determine_border_color(image_data)
        bordered_image = add_border_to_image(device_image, border_color, 3)
        
        # Center image in cell
        paste_x = x + (cell_width - bordered_image.width) // 2
        paste_y = y + (cell_height - bordered_image.height) // 2
        
        mosaic.paste(bordered_image, (paste_x, paste_y))
        
        # Add device label
        try:
            draw = ImageDraw.Draw(mosaic)
            device_label = f"{image_data.get('host_name', '')}-{image_data.get('device_id', '')}"
            
            # Try to use a font, fallback to default
            try:
                font = ImageFont.truetype("arial.ttf", 12)
            except:
                font = ImageFont.load_default()
                
            draw.text((x + 5, y + 5), device_label, fill=(255, 255, 255), font=font)
        except Exception as e:
            print(f"[@heatmap_utils] Failed to add device label: {e}")
    
    return mosaic

def upload_to_r2(image: Image.Image, filename: str) -> Optional[str]:
    """Upload image to R2 storage and return public URL"""
    try:
        # Convert image to bytes
        img_bytes = io.BytesIO()
        image.save(img_bytes, format='JPEG', quality=85)
        img_bytes.seek(0)
        
        # TODO: Implement actual R2 upload
        # For now, save locally and return mock URL
        local_path = f"/tmp/heatmap/{filename}"
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        with open(local_path, 'wb') as f:
            f.write(img_bytes.getvalue())
        
        # Return mock URL (replace with actual R2 URL)
        public_url = f"https://your-r2-domain.com/heatmap/{filename}"
        print(f"[@heatmap_utils] Uploaded mosaic to: {public_url}")
        
        return public_url
        
    except Exception as e:
        print(f"[@heatmap_utils] Failed to upload to R2: {e}")
        return None

def process_heatmap_generation(job_id: str, images_by_timestamp: Dict[str, List[Dict]], incidents: List[Dict]):
    """Process heatmap generation in background thread"""
    set_low_priority()
    
    with job_lock:
        job = active_jobs.get(job_id)
        if not job:
            return
        job.status = 'processing'
    
    try:
        timestamps = sorted(images_by_timestamp.keys())
        total_timestamps = len(timestamps)
        
        if total_timestamps == 0:
            raise Exception("No timestamps to process")
        
        mosaic_urls = []
        
        for i, timestamp in enumerate(timestamps):
            # Check if job was cancelled
            with job_lock:
                if active_jobs[job_id].status == 'failed':
                    return
            
            images_data = images_by_timestamp[timestamp]
            
            # Add incident information to image data
            for image_data in images_data:
                # Check if this device has incidents at this timestamp
                device_incidents = [
                    inc for inc in incidents
                    if inc['host_name'] == image_data['host_name'] and
                       inc['device_id'] == image_data['device_id'] and
                       abs((datetime.fromisoformat(inc['start_time']) - datetime.fromisoformat(timestamp)).total_seconds()) < 30
                ]
                image_data['has_incidents'] = len(device_incidents) > 0
            
            # Create mosaic for this timestamp
            mosaic_image = create_mosaic_image(images_data)
            
            # Upload to R2
            filename = f"{job_id}_{timestamp.replace(':', '-')}.jpg"
            public_url = upload_to_r2(mosaic_image, filename)
            
            if public_url:
                mosaic_urls.append(public_url)
            
            # Update progress
            progress = int((i + 1) / total_timestamps * 100)
            with job_lock:
                active_jobs[job_id].progress = progress
            
            print(f"[@heatmap_utils] Job {job_id}: {progress}% complete")
            
            # Small delay to prevent CPU overload
            time.sleep(0.1)
        
        # Mark job as completed
        with job_lock:
            job = active_jobs[job_id]
            job.status = 'completed'
            job.progress = 100
            job.mosaic_urls = mosaic_urls
        
        print(f"[@heatmap_utils] Job {job_id} completed successfully")
        
    except Exception as e:
        print(f"[@heatmap_utils] Job {job_id} failed: {e}")
        with job_lock:
            job = active_jobs[job_id]
            job.status = 'failed'
            job.error = str(e)

# Thread pool for background processing
executor = ThreadPoolExecutor(max_workers=MAX_WORKER_THREADS)

def start_heatmap_generation(job_id: str, images_by_timestamp: Dict[str, List[Dict]], incidents: List[Dict]):
    """Start heatmap generation in background"""
    future = executor.submit(process_heatmap_generation, job_id, images_by_timestamp, incidents)
    print(f"[@heatmap_utils] Started background processing for job: {job_id}")
    return future

def cleanup_old_jobs(max_age_hours: int = 24):
    """Clean up old completed/failed jobs"""
    cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
    
    with job_lock:
        jobs_to_remove = [
            job_id for job_id, job in active_jobs.items()
            if job.created_at < cutoff_time and job.status in ['completed', 'failed']
        ]
        
        for job_id in jobs_to_remove:
            del active_jobs[job_id]
            print(f"[@heatmap_utils] Cleaned up old job: {job_id}")

# Auto-cleanup on module load
cleanup_old_jobs() 