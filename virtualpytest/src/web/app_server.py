#!/usr/bin/env python3
"""
VirtualPyTest Server Application

Usage: python3 app_server.py

Environment Variables Required (in .env.server file):
    SERVER_IP - IP address of this server
    SERVER_PORT - Port for this server (default: 5009)
    GITHUB_TOKEN - GitHub token for authentication (loaded when needed)
    DEBUG - Set to 'true' to enable debug mode (default: false)
"""

import sys
import os
import time
import atexit

# Simple path setup - add essential directories to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(current_dir)
sys.path.insert(0, os.path.join(src_dir, 'utils'))
sys.path.insert(0, os.path.join(src_dir, 'navigation'))
sys.path.insert(0, os.path.join(src_dir, 'controllers'))
sys.path.insert(0, os.path.join(src_dir, 'models'))  # for devicemodel_utils
sys.path.insert(0, os.path.join(current_dir, 'utils'))  # for adbUtils in web/utils
sys.path.insert(0, os.path.join(current_dir, 'cache'))  # for navigation_cache
sys.path.insert(0, src_dir)

# Import only core utilities
from app_utils import (
    load_environment_variables,
    kill_process_on_port,
    setup_flask_app,
    validate_core_environment,
    initialize_global_sessions,
    initialize_server_globals,
    cleanup_server_resources,
    DEFAULT_TEAM_ID,
    DEFAULT_USER_ID
)

def cleanup_server_ports():
    """Clean up ports for server mode"""
    server_port = int(os.getenv('SERVER_PORT', '5009'))
    kill_process_on_port(server_port)

def setup_server_cleanup():
    """Setup cleanup handlers for server shutdown"""
    def cleanup_on_exit():
        print(f"🧹 Performing cleanup on exit...")
        cleanup_server_resources()
    
    atexit.register(cleanup_on_exit)

def register_core_routes(app):
    """Register only core routes - features load lazily when accessed"""
    try:
        from routes import register_routes
        register_routes(app, mode='server')
        print("✅ Core routes registered successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to register routes: {e}")
        return False

def main():
    """Main function for server application"""
    print("🖥️ VIRTUALPYTEST SERVER")
    print("Starting VirtualPyTest in SERVER mode")
    
    # Step 1: Load and validate ONLY core environment
    script_dir = os.path.dirname(os.path.abspath(__file__))
    load_environment_variables(mode='server', calling_script_dir=script_dir)
    if not validate_core_environment(mode='server'):
        print("❌ Core environment validation failed. Please check your .env.server file")
        return
    
    # Step 2: Clean up ports
    cleanup_server_ports()
    time.sleep(1)  # Brief wait for port cleanup
    
    # Step 3: Setup minimal Flask application
    app = setup_flask_app("VirtualPyTest-Server")
    
    # Step 4: Initialize basic server globals
    global_sessions = initialize_global_sessions()
    initialize_server_globals()
    
    # Store minimal context
    with app.app_context():
        app.global_sessions = global_sessions
        app.default_team_id = DEFAULT_TEAM_ID
        app.default_user_id = DEFAULT_USER_ID
        # Features will be lazy loaded when routes are accessed
        app._lazy_loaded = {}
    
    # Step 5: Register core routes (features load when routes are called)
    if not register_core_routes(app):
        print("❌ Failed to register routes. Cannot start server.")
        return
    
    # Step 6: Setup cleanup
    setup_server_cleanup()
    
    # Step 7: Start server with minimal dependencies
    server_port = int(os.getenv('SERVER_PORT', '5009'))
    debug_mode = os.getenv('DEBUG', 'false').lower() == 'true'
    
    print("🎉 Core server ready!")
    print("📦 Features will load on-demand when accessed")
    print(f"🚀 Starting server on port {server_port}")
    print(f"🌐 Server URL: http://0.0.0.0:{server_port}")
    print(f"🐛 Debug mode: {'ENABLED' if debug_mode else 'DISABLED'}")
    
    try:
        app.run(host='0.0.0.0', port=server_port, debug=debug_mode, use_reloader=debug_mode)
    except KeyboardInterrupt:
        print(f"🛑 Server shutting down...")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
    finally:
        print(f"👋 Server stopped")

if __name__ == '__main__':
    main() 