#!/usr/bin/env python3
"""
VirtualPyTest Host Application

This application runs in host mode and connects to a VirtualPyTest server.
It registers itself with the server and provides device control capabilities.

Usage:
    python3 app_host.py

Environment Variables Required (in .env.host file):
    SERVER_IP - IP address of the server (e.g., 77.56.53.130 or https://77.56.53.130)
    SERVER_PORT - Port of the server (default: 5009)
    SERVER_PROTOCOL - Protocol to use for server (http or https, default: http)
    HOST_NAME - Name of this host (e.g., sunri-pi1)
    HOST_IP - IP address of this host
    HOST_PROTOCOL - Protocol to use for host (http or https, default: http)
    HOST_PORT_INTERNAL - Internal port where Flask app runs (default: 5119)
    HOST_PORT_EXTERNAL - External port for server communication (default: 5119)
    HOST_PORT_WEB - Web interface port (default: 444)
    GITHUB_TOKEN - GitHub token for authentication (loaded when needed)
    DEBUG - Set to 'true' to enable debug mode (default: false)
"""

import sys
import os
import time
import atexit
import threading

# Simple path setup - add essential directories to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(current_dir)
sys.path.insert(0, os.path.join(src_dir, 'utils'))
sys.path.insert(0, os.path.join(current_dir, 'utils'))
sys.path.insert(0, os.path.join(current_dir, 'cache'))
sys.path.insert(0, os.path.join(current_dir, 'services'))
sys.path.insert(0, src_dir)

# Import only core utilities
from app_utils import (
    load_environment_variables,
    kill_process_on_port,
    setup_flask_app,
    validate_core_environment,
    initialize_global_sessions,
    generate_stable_host_id,
    DEFAULT_TEAM_ID,
    DEFAULT_USER_ID
)

from host_utils import (
    register_host_with_server,
    start_ping_thread,
    cleanup_on_exit
)

# Import host_utils module to access global storage
import host_utils

def cleanup_host_ports():
    """Clean up ports for host mode"""
    host_port_internal = int(os.getenv('HOST_PORT_INTERNAL', '5119'))
    host_port_web = int(os.getenv('HOST_PORT_WEB', '444'))
    
    kill_process_on_port(host_port_internal)
    kill_process_on_port(host_port_web)

def setup_host_cleanup():
    """Setup cleanup handlers for host shutdown"""
    def cleanup_on_exit_wrapper():
        print(f"🧹 Host cleanup on exit...")
        cleanup_on_exit()
        print(f"✅ Host cleanup completed")
    
    atexit.register(cleanup_on_exit_wrapper)

def register_core_routes(app):
    """Register only core routes - features load lazily when accessed"""
    try:
        from routes import register_routes
        register_routes(app, mode='host')
        print("✅ Core routes registered successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to register routes: {e}")
        return False

def main():
    """Main function for host application"""
    print("🏠 VIRTUALPYTEST HOST")
    print("Starting VirtualPyTest in HOST mode")
    
    # Step 1: Load and validate ONLY core environment
    calling_script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = load_environment_variables(mode='host', calling_script_dir=calling_script_dir)
    if not validate_core_environment(mode='host'):
        print("❌ Core environment validation failed. Please check your .env.host file")
        return
    
    # Step 2: Clean up ports
    cleanup_host_ports()
    time.sleep(1)  # Brief wait for port cleanup
    
    # Step 3: Setup minimal Flask application
    app = setup_flask_app("VirtualPyTest-Host")
    
    # Step 4: Initialize basic host globals
    global_sessions = initialize_global_sessions()
    
    # Store minimal context
    with app.app_context():
        app.global_sessions = global_sessions
        app.default_team_id = DEFAULT_TEAM_ID
        app.default_user_id = DEFAULT_USER_ID
        # Features will be lazy loaded when routes are accessed
        app._lazy_loaded = {}
    
    # Step 5: Register core routes (features load when routes are called)
    if not register_core_routes(app):
        print("❌ Failed to register routes. Cannot start host.")
        return
    
    # Step 6: Setup cleanup
    setup_host_cleanup()
    
    # Step 7: Get configuration and generate host ID
    host_port_internal = int(os.getenv('HOST_PORT_INTERNAL', '5119'))
    debug_mode = os.getenv('DEBUG', 'false').lower() == 'true'
    host_name = os.getenv('HOST_NAME', 'unknown-host')
    host_ip = os.getenv('HOST_IP', '127.0.0.1')
    host_id = generate_stable_host_id(host_name, host_ip)
    
    print(f"🏠 Host Information:")
    print(f"   Host ID: {host_id}")
    print(f"   Host Name: {host_name}")
    print(f"   Host IP: {host_ip}")
    print(f"   Internal Port: {host_port_internal}")
    
    # Step 8: Start background services
    registration_thread = threading.Thread(
        target=register_host_with_server,
        daemon=True
    )
    registration_thread.start()
    
    start_ping_thread()
    
    # Step 9: Initialize host device after startup (lazy)
    def initialize_host_device_after_startup():
        time.sleep(5)  # Give Flask app time to start
        
        try:
            print(f"🔧 Initializing host device object...")
            
            if host_utils.global_host_device:
                with app.app_context():
                    app.my_host_device = host_utils.global_host_device
                    print(f"✅ Host device initialization completed")
                    print(f"   Host: {host_utils.global_host_device.get('host_name')}")
                    print(f"   Device: {host_utils.global_host_device.get('device_name')}")
            else:
                print(f"⚠️ No global host device found yet (registration may still be in progress)")
                
        except Exception as e:
            print(f"⚠️ Error during host device initialization: {e}")
    
    init_thread = threading.Thread(
        target=initialize_host_device_after_startup,
        daemon=True
    )
    init_thread.start()
    
    # Step 10: Start server with minimal dependencies
    print("🎉 Core host ready!")
    print("📦 Features will load on-demand when accessed")
    print(f"🚀 Starting host on port {host_port_internal}")
    print(f"🌐 Host URL: http://0.0.0.0:{host_port_internal}")
    print(f"📡 Attempting to register with server...")
    print(f"🐛 Debug mode: {'ENABLED' if debug_mode else 'DISABLED'}")
    
    try:
        app.run(host='0.0.0.0', port=host_port_internal, debug=debug_mode, use_reloader=debug_mode)
    except KeyboardInterrupt:
        print(f"🛑 Host shutting down...")
    except Exception as e:
        print(f"❌ Error starting host: {e}")
    finally:
        print(f"👋 Host application stopped")

if __name__ == '__main__':
    main() 