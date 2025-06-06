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

# Environment validation and logging
print("=" * 60)
print("🔍 ENVIRONMENT VARIABLES ANALYSIS")
print("=" * 60)

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

# Client mode specific environment variables with validation
if SERVER_MODE == 'client':
    print("\n📱 CLIENT MODE ENVIRONMENT VALIDATION:")
    print("-" * 40)
    
    # Required environment variables for client mode
    required_client_vars = {
        'SERVER_URL': os.getenv('SERVER_URL'),
        'SERVER_PORT': os.getenv('SERVER_PORT'),
        'CLIENT_IP': os.getenv('CLIENT_IP'),
        'CLIENT_PORT': os.getenv('CLIENT_PORT'),
        'CLIENT_NAME': os.getenv('CLIENT_NAME'),
        'DEVICE_MODEL': os.getenv('DEVICE_MODEL')
    }
    
    missing_vars = []
    empty_vars = []
    
    for var_name, var_value in required_client_vars.items():
        status = "✅ SET" if var_value else "❌ NOT SET"
        print(f"  {var_name}: {var_value or 'NOT SET'} ({status})")
        
        if not var_value:
            missing_vars.append(var_name)
        elif var_value.strip() == '':
            empty_vars.append(var_name)
    
    print("\n🔍 CLIENT MODE VALIDATION SUMMARY:")
    if missing_vars:
        print(f"❌ Missing required variables: {', '.join(missing_vars)}")
    if empty_vars:
        print(f"⚠️  Empty variables: {', '.join(empty_vars)}")
    
    if not missing_vars and not empty_vars:
        print("✅ All required client environment variables are set!")
    else:
        print("\n💡 To fix this, set the missing environment variables:")
        print("   Example:")
        for var in missing_vars + empty_vars:
            if var == 'SERVER_URL':
                print(f"   export {var}=127.0.0.1")
            elif var == 'SERVER_PORT':
                print(f"   export {var}=5009")
            elif var == 'CLIENT_IP':
                print(f"   export {var}=127.0.0.1")
            elif var == 'CLIENT_PORT':
                print(f"   export {var}=5119")
            elif var == 'CLIENT_NAME':
                print(f"   export {var}=test-client")
            elif var == 'DEVICE_MODEL':
                print(f"   export {var}=android_mobile")
        print("\n   Then run: python3 app.py --client")
        
        # Don't exit, but warn that registration will likely fail
        print("\n⚠️  WARNING: Client registration will likely fail with missing variables!")

print("=" * 60)

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
    
    print("\n🔗 STARTING CLIENT REGISTRATION")
    print("=" * 50)
    
    # Get environment variables with validation
    server_url = os.getenv('SERVER_URL')
    server_port = os.getenv('SERVER_PORT', '5009')
    client_ip = os.getenv('CLIENT_IP')
    client_port = os.getenv('CLIENT_PORT', '5119')  # Default to 5119 for client
    client_name = os.getenv('CLIENT_NAME', f"client-{uuid4().hex[:8]}")
    device_model = os.getenv('DEVICE_MODEL', 'android_mobile')
    
    print(f"🔍 [CLIENT] Registration Debug Info:")
    print(f"   SERVER_URL env: '{os.getenv('SERVER_URL')}' -> '{server_url}'")
    print(f"   SERVER_PORT env: '{os.getenv('SERVER_PORT')}' -> '{server_port}'")
    print(f"   CLIENT_IP env: '{os.getenv('CLIENT_IP')}' -> '{client_ip}'")
    print(f"   CLIENT_PORT env: '{os.getenv('CLIENT_PORT')}' -> '{client_port}'")
    print(f"   CLIENT_NAME env: '{os.getenv('CLIENT_NAME')}' -> '{client_name}'")
    print(f"   DEVICE_MODEL env: '{os.getenv('DEVICE_MODEL')}' -> '{device_model}'")
    
    # Validate critical environment variables
    validation_errors = []
    
    if not server_url:
        validation_errors.append("SERVER_URL is required but not set")
    
    if not client_ip:
        validation_errors.append("CLIENT_IP is required but not set")
    
    if not os.getenv('DEVICE_MODEL'):
        validation_errors.append("DEVICE_MODEL is required but not set (using default: android_mobile)")
    
    if not os.getenv('CLIENT_NAME'):
        validation_errors.append(f"CLIENT_NAME not set (using generated: {client_name})")
    
    if validation_errors:
        print(f"\n⚠️ [CLIENT] Environment Variable Issues:")
        for error in validation_errors:
            print(f"   - {error}")
        
        # Check if we have critical missing vars
        critical_missing = [error for error in validation_errors if "SERVER_URL" in error or "CLIENT_IP" in error]
        if critical_missing:
            print(f"\n❌ [CLIENT] Cannot proceed with registration due to critical missing variables:")
            for error in critical_missing:
                print(f"   - {error}")
            print(f"\n💡 [CLIENT] Set the missing variables and try again:")
            if not server_url:
                print(f"   export SERVER_URL=127.0.0.1")
            if not client_ip:
                print(f"   export CLIENT_IP=127.0.0.1")
            return
        else:
            print(f"\n⚠️ [CLIENT] Proceeding with warnings (using defaults where possible)")
    
    # Construct full server URL with port
    if '://' in server_url:
        # URL format: http://server-ip or http://server-ip:port
        if ':' in server_url.split('://')[-1] and server_url.split('://')[-1].count(':') >= 1:
            # URL already has port
            full_server_url = server_url
        else:
            # URL without port, add it
            full_server_url = f"{server_url}:{server_port}"
    else:
        # IP format: server-ip
        full_server_url = f"http://{server_url}:{server_port}"
    
    print(f"\n🌐 [CLIENT] Full server URL: {full_server_url}")
    
    try:
        import socket
        import requests
        
        # Get local IP - use CLIENT_IP if set, otherwise auto-detect
        if client_ip:
            local_ip = client_ip
            print(f"📍 [CLIENT] Using configured CLIENT_IP: {client_ip}")
        else:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            print(f"📍 [CLIENT] Auto-detected local IP: {local_ip}")
        
        # Get public IP (simplified - could use external service)
        public_ip = local_ip  # For now, use local IP
        
        client_info = {
            'client_id': str(uuid4()),
            'public_ip': public_ip,
            'local_ip': local_ip,
            'client_port': client_port,
            'name': client_name,
            'device_model': device_model,
            'controller_types': ['remote', 'av', 'verification'],
            'capabilities': ['stream', 'capture', 'verification'],
            'status': 'online'
        }
        
        print(f"\n📤 [CLIENT] Sending registration request to: {full_server_url}/api/system/register")
        print(f"📦 [CLIENT] Client info payload:")
        for key, value in client_info.items():
            print(f"     {key}: '{value}' (type: {type(value).__name__})")
        
        # Test server connectivity first
        try:
            health_response = requests.get(f"{full_server_url}/api/system/health", timeout=5)
            print(f"\n🏥 [CLIENT] Server health check: {health_response.status_code}")
            if health_response.status_code == 200:
                health_data = health_response.json()
                print(f"     Server health data: {health_data}")
            else:
                print(f"     Server health response: {health_response.text}")
        except Exception as health_error:
            print(f"\n⚠️ [CLIENT] Server health check failed: {health_error}")
            print(f"   This might indicate the server is not running or not accessible")
        
        # Send registration request
        response = requests.post(
            f"{full_server_url}/api/system/register", 
            json=client_info, 
            timeout=10,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"\n📨 [CLIENT] Registration response:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        print(f"   Response Text: {response.text}")
        
        if response.status_code == 200:
            client_registration_state['registered'] = True
            client_registration_state['client_id'] = client_info['client_id']
            client_registration_state['server_url'] = full_server_url
            print(f"\n✅ [CLIENT] Successfully registered with server!")
            print(f"   Server: {full_server_url}")
            print(f"   Client ID: {client_info['client_id']}")
            print(f"   Device Model: {device_model}")
        else:
            print(f"\n❌ [CLIENT] Registration failed with status: {response.status_code}")
            try:
                error_response = response.json()
                print(f"   Error details: {error_response}")
            except Exception as json_error:
                print(f"   Could not parse error response as JSON: {json_error}")
                print(f"   Raw response: {response.text}")
            
    except requests.exceptions.ConnectionError as conn_error:
        print(f"\n❌ [CLIENT] Connection error: {conn_error}")
        print(f"   Could not connect to server at: {full_server_url}")
        print(f"   Make sure the server is running: python3 app.py --server")
    except requests.exceptions.Timeout as timeout_error:
        print(f"\n❌ [CLIENT] Timeout error: {timeout_error}")
        print(f"   Server did not respond within 10 seconds")
    except Exception as e:
        print(f"\n❌ [CLIENT] Unexpected error during registration: {e}")
        import traceback
        print(f"   Full traceback:")
        traceback.print_exc()
    
    print("=" * 50)

# Initialize based on mode
if SERVER_MODE == 'server':
    print("🖥️  Server mode: Ready to accept client registrations")
elif SERVER_MODE == 'client':
    print("📱 Client mode: Attempting to register with server...")
    # Register with server on startup
    register_with_server()

if __name__ == '__main__':
    # Use different ports for server and client
    port = 5009 if SERVER_MODE == 'server' else 5119
    print(f"Starting Flask app on port {port} in {SERVER_MODE.upper()} mode")
    app.run(host='0.0.0.0', port=port, debug=True) 