import sys
import os
from uuid import uuid4
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import time
import subprocess
import argparse

# Add argument parsing for server/client mode
parser = argparse.ArgumentParser(description='VirtualPyTest Flask Server')
parser.add_argument('--server', action='store_true', help='Run in server mode (default)')
parser.add_argument('--client', action='store_true', help='Run in client mode')
args = parser.parse_args()

# Determine server mode - default to server if no flags specified
if args.client:
    SERVER_MODE = 'client'
elif args.server or (not args.client and not args.server):
    SERVER_MODE = 'server'
else:
    SERVER_MODE = 'server'  # fallback

print(f"Starting in {SERVER_MODE.upper()} mode")

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

# Client mode specific environment variables
if SERVER_MODE == 'client':
    print(f"  SERVER_URL: {os.getenv('SERVER_URL', 'NOT SET')}")
    print(f"  CLIENT_NAME: {os.getenv('CLIENT_NAME', 'NOT SET')}")
    print(f"  DEVICE_MODEL: {os.getenv('DEVICE_MODEL', 'NOT SET')}")

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
    supabase_client = get_supabase_client()
    if supabase_client:
        print("Supabase connected successfully!")
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

# Initialize Flask app context variables for client registry
with app.app_context():
    app._connected_clients = {}
    app._health_check_threads = {}

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

# Global client registry for server mode
connected_clients = {}
health_check_threads = {}

# Client registration state for client mode
client_registration_state = {
    'registered': False,
    'client_id': None,
    'server_url': None
}

# Register all route blueprints
from routes import register_routes
register_routes(app)

# Client auto-registration logic
def register_with_server():
    """Register this client with the server"""
    if SERVER_MODE != 'client':
        return
    
    server_url = os.getenv('SERVER_URL')
    client_name = os.getenv('CLIENT_NAME', f"client-{uuid4().hex[:8]}")
    device_model = os.getenv('DEVICE_MODEL', 'android_mobile')
    
    if not server_url:
        print("ERROR: SERVER_URL not set for client mode")
        return
    
    try:
        import socket
        import requests
        
        # Get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        
        # Get public IP (simplified - could use external service)
        public_ip = local_ip  # For now, use local IP
        
        client_info = {
            'client_id': str(uuid4()),
            'public_ip': public_ip,
            'local_ip': local_ip,
            'name': client_name,
            'device_model': device_model,
            'controller_types': ['remote', 'av', 'verification'],
            'capabilities': ['stream', 'capture', 'verification'],
            'status': 'online'
        }
        
        response = requests.post(f"{server_url}/api/system/register", json=client_info, timeout=10)
        
        if response.status_code == 200:
            client_registration_state['registered'] = True
            client_registration_state['client_id'] = client_info['client_id']
            client_registration_state['server_url'] = server_url
            print(f"✅ Successfully registered with server: {server_url}")
            print(f"   Client ID: {client_info['client_id']}")
            print(f"   Device Model: {device_model}")
        else:
            print(f"❌ Failed to register with server: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error registering with server: {e}")

# Initialize based on mode
if SERVER_MODE == 'server':
    print("🖥️  Server mode: Ready to accept client registrations")
elif SERVER_MODE == 'client':
    print("📱 Client mode: Attempting to register with server...")
    # Register with server on startup
    register_with_server()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5009, debug=True) 