import sys
import os
from uuid import uuid4
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import time
import subprocess

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.local')
load_dotenv(env_path)

# Debug: Log environment variable loading
print(f"Loading environment variables from: {env_path}")
print(f"File exists: {os.path.exists(env_path)}")
print("Environment variables loaded:")
print(f"  HOST_IP: {os.getenv('HOST_IP', 'NOT SET')}")
print(f"  HOST_USERNAME: {os.getenv('HOST_USERNAME', 'NOT SET')}")
print(f"  HOST_PASSWORD: {'***' if os.getenv('HOST_PASSWORD') else 'NOT SET'}")
print(f"  HOST_PORT: {os.getenv('HOST_PORT', 'NOT SET')}")
print(f"  ANDROID_TV_IP: {os.getenv('ANDROID_TV_IP', 'NOT SET')}")
print(f"  ANDROID_TV_PORT: {os.getenv('ANDROID_TV_PORT', 'NOT SET')}")
print(f"  ANDROID_MOBILE_IP: {os.getenv('ANDROID_MOBILE_IP', 'NOT SET')}")
print(f"  ANDROID_MOBILE_PORT: {os.getenv('ANDROID_MOBILE_PORT', 'NOT SET')}")
print(f"  STREAM_PATH: {os.getenv('STREAM_PATH', 'NOT SET')}")
print(f"  SUPABASE_URL: {'SET' if os.getenv('NEXT_PUBLIC_SUPABASE_URL') else 'NOT SET'}")
print(f"  SUPABASE_KEY: {'SET' if os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') else 'NOT SET'}")
print("---")

# Add the parent directory to the path to allow imports
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)  # Insert at beginning to prioritize over local utils

# Add controllers directory to path
controllers_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'controllers')
sys.path.append(controllers_path)

try:
    from utils.supabase_utils import get_supabase_client
    # Import from local web utils directory - add the web utils path specifically
    web_utils_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'utils')
    sys.path.insert(0, web_utils_path)
    # Note: userinterface_utils functions are available but table creation is not needed
    # as the table now exists in the database
    
    # Test the connection by checking if supabase client is available
    supabase = get_supabase_client()
    if supabase:
        print("Supabase connected successfully!")
        supabase_client = True
    else:
        raise Exception("Supabase client not initialized")
except Exception as e:
    print(f"Warning: Supabase connection failed: {e}")
    print("Starting Flask app without Supabase connection...")
    supabase_client = None

# Import VirtualPyTest controller system
try:
    from controllers import ControllerFactory, CONTROLLER_REGISTRY, create_device_controllers
    from controllers.base_controllers import (
        RemoteControllerInterface, 
        AVControllerInterface, 
        VerificationControllerInterface,
        PowerControllerInterface
    )
    print("VirtualPyTest controller system imported successfully!")
    controllers_available = True
except Exception as e:
    print(f"Warning: VirtualPyTest controllers not available: {e}")
    controllers_available = False

app = Flask(__name__)
CORS(app)

# For demo purposes, using a default team_id
# In production, this should come from authentication/session
DEFAULT_TEAM_ID = "7fdeb4bb-3639-4ec3-959f-b54769a219ce"  # Hardcoded team ID
DEFAULT_USER_ID = "eb6cfd93-44ab-4783-bd0c-129b734640f3"   # Hardcoded user ID

# Global session storage for Android TV remote
android_tv_session = {
    'controller': None,
    'connected': False,
    'connection_details': {}
}

# Global session storage for IR remote
ir_remote_session = {
    'controller': None,
    'connected': False,
    'connection_details': {}
}

# Global session storage for Bluetooth remote
bluetooth_remote_session = {
    'controller': None,
    'connected': False,
    'connection_details': {}
}

# Global session storage for Android Mobile
android_mobile_controller = None

# Register all route blueprints
from routes import register_routes
register_routes(app)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5009, debug=True) 