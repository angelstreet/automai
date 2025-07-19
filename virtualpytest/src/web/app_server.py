#!/usr/bin/env python3
"""
VirtualPyTest Server Application - Simplified Fail-Fast Version

Usage: python3 app_server.py

Environment Variables Required (in .env.server file):
    SERVER_URL - Base URL of this server (e.g., https://virtualpytest.com or http://localhost:5109)
    SERVER_PORT - Port for this server (default: 5109)
    GITHUB_TOKEN - GitHub token for authentication (loaded when needed)
    DEBUG - Set to 'true' to enable debug mode (default: false)
"""

import sys
import os
import time
import atexit

# CLEAN PATH SETUP - Only add what's absolutely necessary
current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/web
src_dir = os.path.dirname(current_dir)  # /src
project_root = os.path.dirname(src_dir)  # /virtualpytest

# Add project root to path so we can import src as a package
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import from utils (which is in src/utils)
try:
    from src.utils.app_utils import (
        load_environment_variables,
        kill_process_on_port,
        setup_flask_app,
        validate_core_environment,
        DEFAULT_TEAM_ID,
        DEFAULT_USER_ID
    )
except ImportError as e:
    print(f"❌ CRITICAL: Cannot import app_utils: {e}")
    print("   Make sure app_utils.py exists in the utils directory")
    sys.exit(1)

def validate_startup_requirements():
    """Validate all requirements before starting - FAIL FAST"""
    print("🔍 Validating startup requirements...")
    
    # Check environment
    script_dir = os.path.dirname(os.path.abspath(__file__))
    load_environment_variables(mode='server', calling_script_dir=script_dir)
    
    if not validate_core_environment(mode='server'):
        print("❌ CRITICAL: Environment validation failed")
        sys.exit(1)
    
    # Check routes can be imported
    try:
        from routes import register_routes
        print("✅ Routes module can be imported")
    except ImportError as e:
        print(f"❌ CRITICAL: Cannot import routes: {e}")
        sys.exit(1)
    
    print("✅ All startup requirements validated")

def setup_and_cleanup():
    """Setup Flask app and cleanup handlers"""
    # Clean ports
    server_port = int(os.getenv('SERVER_PORT', '5009'))
    kill_process_on_port(server_port)
    time.sleep(1)
    
    # Setup Flask app
    app = setup_flask_app("VirtualPyTest-Server")
    
    # Store context
    with app.app_context():
        app.default_team_id = DEFAULT_TEAM_ID
        app.default_user_id = DEFAULT_USER_ID
    
    # Setup cleanup
    def cleanup_on_exit():
        print("🧹 Performing cleanup on exit...")
    
    atexit.register(cleanup_on_exit)
    
    return app

def register_all_server_routes(app):
    """Register ALL server routes - FAIL FAST if any fail"""
    print("📋 Loading ALL server routes...")
    
    try:
        from routes import register_routes
        register_routes(app, mode='server')
        return True
    except Exception as e:
        print(f"❌ CRITICAL: Failed to load server routes: {e}")
        import traceback
        traceback.print_exc()
        return False

def start_server(app):
    """Start Flask server with Gunicorn 10-minute timeout"""
    server_port = int(os.getenv('SERVER_PORT', '5109'))
    
    print("🎉 Server ready!")
    print(f"🚀 Starting server on port {server_port} with 10-minute timeout")
    print(f"🌐 Server URL: http://0.0.0.0:{server_port}")
    
    try:
        import gunicorn.app.base
        
        class StandaloneApplication(gunicorn.app.base.BaseApplication):
            def __init__(self, app, options=None):
                self.options = options or {}
                self.application = app
                super().__init__()

            def load_config(self):
                config = {key: value for key, value in self.options.items()
                        if key in self.cfg.settings and value is not None}
                for key, value in config.items():
                    self.cfg.set(key.lower(), value)

            def load(self):
                return self.application

        options = {
            'bind': f'0.0.0.0:{server_port}',
            'workers': 1,
            'timeout': 600,  # 10 minutes for browser-use tasks
        }
        
        StandaloneApplication(app, options).run()
        
    except ImportError:
        print("❌ Gunicorn required. Install: pip install gunicorn")
        sys.exit(1)
    except KeyboardInterrupt:
        print("🛑 Server shutting down...")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)
    finally:
        print("👋 Server stopped")

def main():
    """Main function"""
    print("🖥️ VIRTUALPYTEST SERVER")
    print("Starting VirtualPyTest in SERVER mode")
    
    # STEP 1: Validate requirements
    validate_startup_requirements()
    
    # STEP 2: Setup Flask app and cleanup
    app = setup_and_cleanup()
    
    # STEP 3: Register ALL routes
    if not register_all_server_routes(app):
        print("❌ CRITICAL: Cannot start server without all routes")
        sys.exit(1)
    
    # STEP 4: Start server
    start_server(app)

if __name__ == '__main__':
    main() 