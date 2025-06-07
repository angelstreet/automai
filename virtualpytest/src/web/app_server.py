#!/usr/bin/env python3
"""
VirtualPyTest Server Application

This application runs in server mode and accepts connections from VirtualPyTest hosts.
It manages host registrations and provides centralized control capabilities.

Usage:
    python3 app_server.py

Environment Variables Required (in .env.server file):
    SERVER_URL - IP address of this server (e.g., 77.56.53.130)
    SERVER_PORT - Port for this server (default: 5009)
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

from utils.serverUtils import (
    initialize_server_globals,
    cleanup_server_resources
)

def cleanup_server_ports():
    """Clean up ports for server mode"""
    print(f"\n🧹 [SERVER] Cleaning up ports for SERVER mode...")
    
    # Get server port from environment (load env first if not loaded)
    server_port = int(os.getenv('SERVER_PORT', '5009'))
    kill_process_on_port(server_port)

def setup_server_cleanup():
    """Setup cleanup handlers for server shutdown"""
    def cleanup_on_exit():
        """Cleanup function called on normal exit"""
        print(f"\n🧹 [SERVER] Performing cleanup on exit...")
        cleanup_server_resources()
        print(f"✅ [SERVER] Server cleanup completed")
    
    # Register exit handler for normal exit
    atexit.register(cleanup_on_exit)

def main():
    """Main function for server application"""
    print("=" * 60)
    print("🖥️  VIRTUALPYTEST SERVER APPLICATION")
    print("=" * 60)
    print("Starting VirtualPyTest in SERVER mode")
    print("This server will accept connections from VirtualPyTest hosts")
    print("Configuration will be loaded from .env.server file")
    print("=" * 60)
    
    # Load environment variables FIRST (needed for port cleanup)
    env_path = load_environment_variables(mode='server')
    
    # Setup Python paths
    setup_paths()
    
    # Clean up ports before starting (now that env is loaded)
    cleanup_server_ports()
    
    # Wait a moment for ports to be fully released
    print(f"⏳ [SERVER] Waiting for ports to be fully released...")
    time.sleep(2)
    
    # Validate environment variables for server mode
    validate_environment_variables(mode='server')
    
    # Setup Flask application
    app = setup_flask_app("VirtualPyTest-Server")
    
    # Setup Supabase connection
    supabase_client = setup_supabase_connection()
    
    # Setup controllers
    controllers_available = setup_controllers()
    
    # Initialize global sessions
    global_sessions = initialize_global_sessions()
    
    # Initialize server-specific globals
    initialize_server_globals()
    
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
        print("✅ [SERVER] Routes registered successfully")
    except Exception as e:
        print(f"⚠️ [SERVER] Warning: Could not register routes: {e}")
    
    # Setup cleanup handlers (only atexit, not signal handlers to avoid conflicts)
    setup_server_cleanup()
    
    # Get configuration
    server_port = int(os.getenv('SERVER_PORT', '5009'))
    debug_mode = os.getenv('DEBUG', 'false').lower() == 'true'
    
    print(f"\n🚀 [SERVER] Starting Flask app on port {server_port}")
    print(f"🌐 [SERVER] Server will be available at: http://0.0.0.0:{server_port}")
    print(f"📡 [SERVER] Ready to accept host registrations")
    print(f"🐛 [SERVER] Debug mode: {'ENABLED' if debug_mode else 'DISABLED'}")
    print("=" * 60)
    
    try:
        app.run(host='0.0.0.0', port=server_port, debug=debug_mode, use_reloader=debug_mode)
    except KeyboardInterrupt:
        print(f"\n🛑 [SERVER] Received keyboard interrupt, shutting down...")
    except Exception as e:
        print(f"\n❌ [SERVER] Error starting Flask app: {e}")
    finally:
        print(f"\n👋 [SERVER] Server application stopped")

if __name__ == '__main__':
    main() 