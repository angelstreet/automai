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
    GITHUB_TOKEN - GitHub token for authentication
    DEBUG - Set to 'true' to enable debug mode (default: false)
"""

import sys
import os
import time
import atexit
import threading
import signal

# Add necessary paths for imports (same as routes/__init__.py)
current_dir = os.path.dirname(os.path.abspath(__file__))
web_dir = current_dir
src_dir = os.path.dirname(web_dir)
parent_dir = os.path.dirname(src_dir)

# Add paths to sys.path
paths_to_add = [
    os.path.join(web_dir, 'utils'),           # /src/web/utils
    os.path.join(web_dir, 'cache'),           # /src/web/cache
    os.path.join(web_dir, 'services'),        # /src/web/services
    os.path.join(parent_dir, 'utils'),        # /src/utils  
    src_dir,                                  # /src
    os.path.join(parent_dir, 'controllers'),  # /controllers
]

for path in paths_to_add:
    if path not in sys.path:
        sys.path.insert(0, path)

from appUtils import (
    load_environment_variables,
    kill_process_on_port,
    setup_flask_app,
    setup_supabase_connection,
    setup_controllers,
    validate_environment_variables,
    initialize_global_sessions,
    generate_stable_host_id,
    get_host_system_stats,
    DEFAULT_TEAM_ID,
    DEFAULT_USER_ID
)

from hostUtils import (
    register_with_server,
    start_health_check_thread,
    cleanup_host_resources
)

def cleanup_host_ports():
    """Clean up ports for host mode"""
    print(f"\n🧹 [HOST] Cleaning up ports for HOST mode...")
    
    # Get host ports from environment (load env first if not loaded)
    host_port_internal = int(os.getenv('HOST_PORT_INTERNAL', '5119'))
    host_port_web = int(os.getenv('HOST_PORT_WEB', '444'))
    
    kill_process_on_port(host_port_internal)
    kill_process_on_port(host_port_web)

def setup_host_cleanup():
    """Setup cleanup handlers for host shutdown"""
    def cleanup_on_exit():
        """Cleanup function called on normal exit"""
        print(f"\n🧹 [HOST] Performing cleanup on exit...")
        cleanup_host_resources()
        print(f"✅ [HOST] Host cleanup completed")
    
    # Register exit handler for normal exit
    atexit.register(cleanup_on_exit)

def main():
    """Main function for host application"""
    print("=" * 60)
    print("🏠 VIRTUALPYTEST HOST APPLICATION")
    print("=" * 60)
    print("Starting VirtualPyTest in HOST mode")
    print("This host will connect to a VirtualPyTest server")
    print("Configuration will be loaded from .env.host file")
    print("=" * 60)
    
    # Load environment variables FIRST (needed for port cleanup)
    env_path = load_environment_variables(mode='host')
    
    # Clean up ports before starting (now that env is loaded)
    cleanup_host_ports()
    
    # Wait a moment for ports to be fully released
    print(f"⏳ [HOST] Waiting for ports to be fully released...")
    time.sleep(2)
    
    # Validate environment variables for host mode
    validate_environment_variables(mode='host')
    
    # Setup Flask application
    app = setup_flask_app("VirtualPyTest-Host")
    
    # Setup Supabase connection
    supabase_client = setup_supabase_connection()
    
    # Setup controllers
    controllers_available = setup_controllers()
    
    # Initialize global sessions
    global_sessions = initialize_global_sessions()
    
    # Store global variables in app context
    with app.app_context():
        app.supabase_client = supabase_client
        app.controllers_available = controllers_available
        app.global_sessions = global_sessions
        app.default_team_id = DEFAULT_TEAM_ID
        app.default_user_id = DEFAULT_USER_ID
    
    # Register all route blueprints for host mode
    try:
        from routes import register_routes
        register_routes(app, mode='host')
        print("✅ [HOST] Routes registered successfully")
    except ImportError as import_error:
        print(f"❌ [HOST] CRITICAL: Could not import routes module: {import_error}")
        print("   Host cannot function without routes. Stopping...")
        sys.exit(1)
    except Exception as e:
        print(f"❌ [HOST] CRITICAL: Could not register routes: {e}")
        print("   Host cannot function without routes. Stopping...")
        sys.exit(1)
    
    # Setup cleanup handlers (only atexit, not signal handlers to avoid conflicts)
    setup_host_cleanup()
    
    # Get configuration
    host_port_internal = int(os.getenv('HOST_PORT_INTERNAL', '5119'))
    debug_mode = os.getenv('DEBUG', 'false').lower() == 'true'
    
    # Generate stable host ID
    host_name = os.getenv('HOST_NAME', 'unknown-host')
    host_ip = os.getenv('HOST_IP', '127.0.0.1')
    host_id = generate_stable_host_id(host_name, host_ip)
    
    print(f"\n🏠 [HOST] Host Information:")
    print(f"   Host ID: {host_id}")
    print(f"   Host Name: {host_name}")
    print(f"   Host IP: {host_ip}")
    print(f"   Internal Port: {host_port_internal}")
    
    # Register with server in a separate thread
    registration_thread = threading.Thread(
        target=register_with_server,
        args=(app, host_id),
        daemon=True
    )
    registration_thread.start()
    
    # Start health check thread
    health_check_thread = start_health_check_thread(app, host_id)
    
    print(f"\n🚀 [HOST] Starting Flask app on port {host_port_internal}")
    print(f"🌐 [HOST] Host will be available at: http://0.0.0.0:{host_port_internal}")
    print(f"📡 [HOST] Attempting to register with server...")
    print(f"🐛 [HOST] Debug mode: {'ENABLED' if debug_mode else 'DISABLED'}")
    print("=" * 60)
    
    try:
        app.run(host='0.0.0.0', port=host_port_internal, debug=debug_mode, use_reloader=debug_mode)
    except KeyboardInterrupt:
        print(f"\n🛑 [HOST] Received keyboard interrupt, shutting down...")
    except Exception as e:
        print(f"\n❌ [HOST] Error starting Flask app: {e}")
    finally:
        print(f"\n👋 [HOST] Host application stopped")

if __name__ == '__main__':
    main() 