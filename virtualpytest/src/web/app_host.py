#!/usr/bin/env python3
"""
VirtualPyTest Host Application - Simplified Fail-Fast Version

This application runs in host mode and connects to a VirtualPyTest server.
It registers itself with the server and provides device control capabilities.

Usage:
    python3 app_host.py

Environment Variables Required (in .env.host file):
    SERVER_URL - Base URL of the server (e.g., https://virtualpytest.com or http://localhost:5109)
    HOST_URL - Base URL of this host (e.g., https://virtualpytest.com or http://localhost:6109)
    HOST_PORT - Port where Flask app runs (default: 6109)
    HOST_NAME - Name of this host (e.g., sunri-pi1)
    GITHUB_TOKEN - GitHub token for authentication (loaded when needed)
    DEBUG - Set to 'true' to enable debug mode (default: false)
"""

import sys
import os
import time
import atexit
import threading

# CLEAN PATH SETUP - Single addition to make src a package
current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/web
src_dir = os.path.dirname(current_dir)  # /src
project_root = os.path.dirname(src_dir)  # /virtualpytest

# Add project root to path so we can import src as a package
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import using consistent src. prefix (fail fast if missing)
try:
    from src.utils.app_utils import (
        load_environment_variables,
        kill_process_on_port,
        setup_flask_app,
        validate_core_environment,
        initialize_global_sessions,
        DEFAULT_TEAM_ID,
        DEFAULT_USER_ID
    )
    from src.utils.host_utils import (
        register_host_with_server,
        start_ping_thread,
        cleanup_on_exit
    )
except ImportError as e:
    print(f"❌ Failed to import required modules: {e}")
    print("❌ Please ensure you're running from the correct directory and src.utils modules exist")
    sys.exit(1)

def cleanup_host_ports():
    """Clean up ports for host mode"""
    print("[@host:main:cleanup_host_ports] Cleaning up host ports...")
    host_port = int(os.getenv('HOST_PORT', '6109'))
    
    kill_process_on_port(host_port)
    print("[@host:main:cleanup_host_ports] Port cleanup completed")

def setup_host_cleanup():
    """Setup cleanup handlers for host shutdown"""
    def cleanup_on_exit_wrapper():
        print(f"[@host:main:cleanup_on_exit_wrapper] Host cleanup on exit...")
        cleanup_on_exit()
        print(f"[@host:main:cleanup_on_exit_wrapper] Host cleanup completed")
    
    atexit.register(cleanup_on_exit_wrapper)

def register_host_routes(app):
    """Register host routes - FAIL FAST"""
    print("[@host:main:register_host_routes] Loading host routes...")
    try:
        from routes import register_routes
        register_routes(app, mode='host')
        print("[@host:main:register_host_routes] Host routes registered successfully")
        return True
    except Exception as e:
        print(f"[@host:main:register_host_routes] ❌ Failed to register routes: {e}")
        return False

# Global flag to prevent multiple initializations
_host_object_initialized = False

def initialize_host_object(app):
    """Initialize host object after startup"""
    global _host_object_initialized
    
    if _host_object_initialized:
        print(f"[@host:main:initialize_host_object] Host object already initialized, skipping...")
        return
    
    def delayed_init():
        global _host_object_initialized
        
        if _host_object_initialized:
            return
            
        time.sleep(5)  # Give Flask app time to start
        
        try:
            print(f"[@host:main:initialize_host_object] Initializing host object...")
            
            # Import host_utils to access global storage
            import src.utils.host_utils as host_utils
            
            if hasattr(host_utils, 'global_host_object') and host_utils.global_host_object:
                with app.app_context():
                    app.my_host_device = host_utils.global_host_object
                    _host_object_initialized = True
                    print(f"[@host:main:initialize_host_object] Host device initialization completed")
                    print(f"[@host:main:initialize_host_object] Host: {host_utils.global_host_object.get('host_name')}")
                    print(f"[@host:main:initialize_host_object] Device Name: {host_utils.global_host_object.get('device_name')}")
                    print(f"[@host:main:initialize_host_object] Device Model: {host_utils.global_host_object.get('device_model')}")
                    print(f"[@host:main:initialize_host_object] Device IP: {host_utils.global_host_object.get('device_ip')}")
                    print(f"[@host:main:initialize_host_object] Device Port: {host_utils.global_host_object.get('device_port')}")
            else:
                print(f"[@host:main:initialize_host_object] No global host object found yet (registration may still be in progress)")
                
        except Exception as e:
            print(f"[@host:main:initialize_host_object] ⚠️ Error during host object initialization: {e}")
    
    init_thread = threading.Thread(target=delayed_init, daemon=True)
    init_thread.start()

def start_background_services():
    """Start background services for host registration and health checks"""
    print("[@host:main:start_background_services] Starting background services...")
    
    # Host registration thread
    registration_thread = threading.Thread(
        target=register_host_with_server,
        daemon=True
    )
    registration_thread.start()
    
    # Ping/health check thread
    start_ping_thread()
    
    print("[@host:main:start_background_services] Background services started")

def main():
    """Main function for host application - Simplified 4-Step Workflow"""
    print("🏠 VIRTUALPYTEST HOST")
    print("Starting VirtualPyTest in HOST mode")
    
    # STEP 1: Validate Environment (FAIL FAST)
    print("[@host:main:main] Step 1: Validating environment...")
    calling_script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = load_environment_variables(mode='host', calling_script_dir=calling_script_dir)
    
    if not validate_core_environment(mode='host'):
        print("[@host:main:main] ❌ Core environment validation failed. Please check your .env.host file")
        sys.exit(1)
    
    # STEP 2: Setup Flask App and Clean Ports
    print("[@host:main:main] Step 2: Setting up Flask application...")
    cleanup_host_ports()
    time.sleep(1)  # Brief wait for port cleanup
    
    app = setup_flask_app("VirtualPyTest-Host")
    
    # Initialize app context
    global_sessions = initialize_global_sessions()
    with app.app_context():
        app.global_sessions = global_sessions
        app.default_team_id = DEFAULT_TEAM_ID
        app.default_user_id = DEFAULT_USER_ID
    
    # STEP 3: Register Routes (FAIL FAST)
    print("[@host:main:main] Step 3: Registering routes...")
    if not register_host_routes(app):
        print("[@host:main:main] ❌ Failed to register routes. Cannot start host.")
        sys.exit(1)
    
    # STEP 4: Start Host Services
    print("[@host:main:main] Step 4: Starting host services...")
    setup_host_cleanup()
    
    # Get configuration
    host_port = int(os.getenv('HOST_PORT', '6109'))
    debug_mode = os.getenv('DEBUG', 'false').lower() == 'true'
    host_name = os.getenv('HOST_NAME', 'unknown-host')
    host_url = os.getenv('HOST_URL', f'http://localhost:{host_port}')
    
    print(f"[@host:main:main] Host Information:")
    print(f"[@host:main:main]    Host Name: {host_name}")
    print(f"[@host:main:main]    Host URL: {host_url}")
    print(f"[@host:main:main]    Host Port: {host_port}")
    
    # Start background services
    start_background_services()
    
    # Initialize host object (async)
    initialize_host_object(app)
    
    # Start Flask application
    print("[@host:main:main] 🎉 Host ready!")
    print(f"[@host:main:main] 🚀 Starting host on port {host_port}")
    print(f"[@host:main:main] 📡 Attempting to register with server...")
    print(f"[@host:main:main] 🐛 Debug mode: {'ENABLED' if debug_mode else 'DISABLED'}")
    
    try:
        app.run(host='0.0.0.0', port=host_port, debug=debug_mode, use_reloader=debug_mode)
    except KeyboardInterrupt:
        print(f"[@host:main:main] 🛑 Host shutting down...")
    except Exception as e:
        print(f"[@host:main:main] ❌ Error starting host: {e}")
    finally:
        print(f"[@host:main:main] 👋 Host application stopped")

if __name__ == '__main__':
    main() 