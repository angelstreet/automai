"""
Routes package for VirtualPyTest Web API

This package contains organized route modules for the Flask application.
"""

import sys
import os

# Add necessary paths for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
web_dir = os.path.dirname(current_dir)
src_dir = os.path.dirname(web_dir)
parent_dir = os.path.dirname(src_dir)

print(f"[@routes:__init__] Setting up import paths...")
print(f"[@routes:__init__] Current dir: {current_dir}")
print(f"[@routes:__init__] Web dir: {web_dir}")
print(f"[@routes:__init__] Src dir: {src_dir}")

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
        print(f"[@routes:__init__] Added to sys.path: {path}")
    else:
        print(f"[@routes:__init__] Already in sys.path: {path}")

print(f"[@routes:__init__] Starting route imports...")

from flask import Flask
from flask_cors import CORS

def register_routes(app: Flask, mode='server'):
    """
    Register application routes based on mode
    
    Args:
        app: Flask application instance
        mode: 'server' or 'host' - determines which routes to register
    """
    CORS(app)
    
    print(f"[@routes:register_routes] Registering routes for mode: {mode}")
    
    # =====================================================
    # COMMON ROUTES (registered on both server and host)
    # =====================================================
    from .common_core_routes import core_bp
    from .common_device_routes import device_bp
    from .common_controller_routes import controller_bp
    from .common_audiovideo_routes import audiovideo_bp
    from .common_stats_routes import stats_bp
    from .common_userinterface_routes import userinterface_bp
    from .common_devicemodel_routes import devicemodel_bp
    
    app.register_blueprint(core_bp)
    app.register_blueprint(device_bp)
    app.register_blueprint(controller_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(userinterface_bp)
    app.register_blueprint(devicemodel_bp)
    
    if mode == 'server':
        # =====================================================
        # SERVER-ONLY ROUTES (port 5009)
        # =====================================================
        print(f"[@routes:register_routes] Registering SERVER-specific routes")
        
        # Import server-only routes
        from .server_remote_routes import remote_bp
        from .server_navigation_routes import navigation_bp
        from .server_campaign_routes import campaign_bp
        from .server_testcase_routes import testcase_bp
        from .server_screen_definition_routes import screen_definition_blueprint
        from .server_pathfinding_routes import pathfinding_bp
        from .server_validation_routes import validation_bp
        from .server_navigation_config_routes import navigation_config_bp
        from .server_power_routes import power_bp
        
        # Import server verification routes
        from .server_verification_common_routes import verification_common_bp
        from .server_verification_control_routes import verification_control_server_bp
        from .server_verification_image_routes import verification_image_server_bp
        from .server_verification_text_routes import verification_text_server_bp
        from .server_verification_adb_routes import verification_adb_server_bp
        from .server_verification_execution_routes import verification_execution_server_bp
        
        # Import server control routes
        from .server_control_routes import server_control_bp
        
        # Import system routes with error handling
        try:
            from .server_system_routes import system_bp
            print(f"[@routes:register_routes] Successfully imported server_system_routes")
        except ImportError as e:
            print(f"[@routes:register_routes] CRITICAL: Failed to import server_system_routes: {e}")
            raise ImportError(f"Cannot import server_system_routes: {e}")
        
        # System management (server manages host registrations)
        app.register_blueprint(system_bp)
        
        # Server-side control routes (device locking, host coordination)
        app.register_blueprint(server_control_bp)
        
        # Server-side verification endpoints (proxy to hosts)
        app.register_blueprint(verification_common_bp)
        app.register_blueprint(verification_control_server_bp)
        app.register_blueprint(verification_image_server_bp)
        app.register_blueprint(verification_text_server_bp)
        app.register_blueprint(verification_adb_server_bp)
        app.register_blueprint(verification_execution_server_bp)
        
        # Server-side functionality
        app.register_blueprint(remote_bp)
        app.register_blueprint(audiovideo_bp)
        app.register_blueprint(navigation_bp)
        app.register_blueprint(navigation_config_bp)
        app.register_blueprint(pathfinding_bp)
        app.register_blueprint(validation_bp)
        app.register_blueprint(campaign_bp)
        app.register_blueprint(testcase_bp)
        app.register_blueprint(screen_definition_blueprint, url_prefix='/api/virtualpytest/screen-definition')
        app.register_blueprint(power_bp)
        
        print(f"[@routes:register_routes] SERVER routes registered successfully")
        
    elif mode == 'host':
        # =====================================================
        # HOST-ONLY ROUTES (port 5119)
        # =====================================================
        print(f"[@routes:register_routes] Registering HOST-specific routes")
        
        # Import host-only routes
        from .host_verification_image_routes import verification_image_host_bp
        from .host_verification_text_routes import verification_text_host_bp
        from .host_verification_adb_routes import verification_adb_host_bp
        from .host_verification_execution_routes import verification_execution_host_bp
        from .host_control_routes import host_control_bp
        
        # Host-side verification endpoints (actual execution)
        app.register_blueprint(verification_image_host_bp)
        app.register_blueprint(verification_text_host_bp)
        app.register_blueprint(verification_adb_host_bp)
        app.register_blueprint(verification_execution_host_bp)
        
        # Host-side control routes (controller management, device control)
        app.register_blueprint(host_control_bp)
        
        # Host-side AV functionality (needed for /release-control endpoint)
        app.register_blueprint(audiovideo_bp)
        
        # Host-side functionality (if needed)
        # Note: Most host routes are in the verification_*_host_bp blueprints
        
        print(f"[@routes:register_routes] HOST routes registered successfully")
        
    else:
        raise ValueError(f"Invalid mode: {mode}. Must be 'server' or 'host'")
    
    print(f"[@routes:register_routes] Route registration completed for mode: {mode}") 