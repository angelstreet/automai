#!/usr/bin/env python3
"""
VirtualPyTest Host Application

This application runs in host mode and connects to a VirtualPyTest server.
It registers itself with the server and provides device control capabilities.

Usage:
    python3 app_host.py

Environment Variables Required (in .env.host file):
    SERVER_URL - IP address of the server (e.g., 77.56.53.130)
    SERVER_PORT - Port of the server (default: 5009)
    HOST_NAME - Name of this host (e.g., sunri-pi1)
    HOST_IP - IP address of this host
    HOST_PORT - Port for this host (default: 5119)
    HOST_NGINX_PORT - Nginx port for this host (default: 444)
    GITHUB_TOKEN - GitHub token for authentication
    DEBUG - Set to 'true' to enable debug mode (default: false)
"""

import sys
import os
import time
import atexit

# Add utils to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'utils'))

from utils.appUtils import (
    load_environment_variables,
    setup_paths,
    kill_process_on_port,
    setup_flask_app,
    setup_supabase_connection,
    setup_controllers,
    validate_environment_variables,
    initialize_global_sessions,
    DEFAULT_TEAM_ID,
    DEFAULT_USER_ID
)

from utils.hostUtils import (
    register_host_with_server,
    stop_ping_thread,
    unregister_from_server
)

def cleanup_host_ports():
    """Clean up ports for host mode"""
    print(f"\n🧹 [HOST] Cleaning up ports for HOST mode...")
    
    # Get host port from environment (load env first if not loaded)
    host_port = int(os.getenv('HOST_PORT', '5119'))
    kill_process_on_port(host_port)
    
    # Also check if we need to clean up any server processes
    # that might be running from previous sessions
    server_port = int(os.getenv('SERVER_PORT', '5009'))
    if server_port != host_port:  # Don't double-clean the same port
        kill_process_on_port(server_port)

def setup_host_cleanup():
    """Setup cleanup handlers for host shutdown"""
    def cleanup_on_exit():
        """Cleanup function called on normal exit"""
        print(f"\n🧹 [HOST] Performing cleanup on exit...")
        stop_ping_thread()
        unregister_from_server()
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
    
    # Setup Python paths
    setup_paths()
    
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
    
    # Register all route blueprints
    try:
        from routes import register_routes
        register_routes(app)
        print("✅ [HOST] Routes registered successfully")
    except Exception as e:
        print(f"⚠️ [HOST] Warning: Could not register routes: {e}")
    
    # Setup cleanup handlers (only atexit, not signal handlers to avoid conflicts)
    setup_host_cleanup()
    
    # Register with server on startup
    print("\n🔗 [HOST] Attempting to register with server...")
    register_host_with_server()
    
    # Get configuration
    host_port = int(os.getenv('HOST_PORT', '5119'))
    debug_mode = os.getenv('DEBUG', 'false').lower() == 'true'
    
    print(f"\n🚀 [HOST] Starting Flask app on port {host_port}")
    print(f"🌐 [HOST] Host will be available at: http://0.0.0.0:{host_port}")
    print(f"🐛 [HOST] Debug mode: {'ENABLED' if debug_mode else 'DISABLED'}")
    print("=" * 60)
    
    try:
        app.run(host='0.0.0.0', port=host_port, debug=debug_mode, use_reloader=debug_mode)
    except KeyboardInterrupt:
        print(f"\n🛑 [HOST] Received keyboard interrupt, shutting down...")
    except Exception as e:
        print(f"\n❌ [HOST] Error starting Flask app: {e}")
    finally:
        print(f"\n👋 [HOST] Host application stopped")

if __name__ == '__main__':
    main() 