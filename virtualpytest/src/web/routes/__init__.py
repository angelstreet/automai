"""
Routes package for VirtualPyTest Web API - Fail Fast Version

This package contains organized route modules for the Flask application.
"""

import sys
import os
from flask import Flask
from flask_cors import CORS

# Ensure src is available as a package for route imports
current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/web/routes
web_dir = os.path.dirname(current_dir)  # /src/web
src_dir = os.path.dirname(web_dir)  # /src
project_root = os.path.dirname(src_dir)  # /virtualpytest

# Add project root to path so we can import src as a package
if project_root not in sys.path:
    sys.path.insert(0, project_root)

def register_routes(app: Flask, mode='server'):
    """Register ALL routes for the specified mode - FAIL FAST"""
    CORS(app)
    
    print(f"[@routes:register_routes] Loading ALL routes for mode: {mode}")
    
    # Common routes (must succeed)
    _register_common_routes(app)
    
    if mode == 'server':
        _register_server_routes(app)
    elif mode == 'host':
        _register_host_routes(app)
    else:
        raise ValueError(f"Invalid mode: {mode}")

def _register_common_routes(app):
    """Register truly common routes - FAIL FAST"""
    print("📋 Loading common routes...")
    
    try:
        from .common_core_routes import core_bp
        
        app.register_blueprint(core_bp)
        print("✅ Common routes registered")
        
    except ImportError as e:
        print(f"❌ CRITICAL: Failed to import common routes: {e}")
        raise

def _register_server_routes(app):
    """Register ALL server routes - FAIL FAST"""
    print("📋 Loading ALL server-specific routes...")
    
    # Server-only routes (including former "common" routes that are actually server-only)
    server_route_modules = [
        ('server_remote_routes', 'remote_bp'),
        ('server_av_routes', 'av_bp'),  # ✅ AV proxy routes
        ('server_stream_proxy_routes', 'server_stream_proxy_routes'),  # ✅ HTTP to HTTPS stream proxy
        ('server_navigation_routes', 'navigation_bp'),
        ('server_campaign_routes', 'campaign_bp'),
        ('server_testcase_routes', 'testcase_bp'),
        ('server_pathfinding_routes', 'pathfinding_bp'),
        ('server_validation_routes', 'validation_bp'),
        ('server_power_routes', 'power_bp'),
        ('server_device_routes', 'device_bp'),  # ✅ Unified naming
        ('server_userinterface_routes', 'userinterface_bp'),  # ✅ Unified naming
        ('server_devicemodel_routes', 'devicemodel_bp'),  # ✅ Unified naming
        ('server_verification_common_routes', 'server_verification_common_bp'),
        ('server_control_routes', 'control_bp'),  # ✅ Unified naming
        ('server_system_routes', 'system_bp'),

        ('server_actions_routes', 'server_actions_bp'),  # ✅ Unified actions API
        ('server_navigation_trees_routes', 'server_navigation_trees_bp'),  # ✅ Navigation trees with history
        ('server_execution_results_routes', 'execution_results_bp'),  # ✅ Execution results tracking

    ]
    
    # Import and register each module (FAIL FAST)
    for module_name, blueprint_name in server_route_modules:
        try:
            module = __import__(f'src.web.routes.{module_name}', fromlist=[blueprint_name])
            blueprint = getattr(module, blueprint_name)
            
            # Register with proper URL prefix for server routes
            if module_name == 'server_actions_routes':
                app.register_blueprint(blueprint, url_prefix='/server')
            elif module_name == 'server_verifications_routes':
                app.register_blueprint(blueprint, url_prefix='/server')
            elif module_name == 'server_execution_results_routes':
                app.register_blueprint(blueprint, url_prefix='/server')

            else:
                app.register_blueprint(blueprint)
            print(f"   ✅ {module_name} -> {blueprint_name}")
            
        except ImportError as e:
            print(f"   ❌ CRITICAL: Failed to import {module_name}: {e}")
            raise
        except AttributeError as e:
            print(f"   ❌ CRITICAL: Blueprint {blueprint_name} not found in {module_name}: {e}")
            raise
    
    print("✅ ALL server routes registered successfully")

def _register_host_routes(app):
    """Register ALL host routes - FAIL FAST"""
    print("📋 Loading ALL host-specific routes...")
    
    host_route_modules = [
        ('host_verification_routes', 'verification_host_bp'),
        ('host_verification_image_routes', 'verification_image_host_bp'),
        ('host_verification_text_routes', 'verification_text_host_bp'),
        ('host_verification_adb_routes', 'verification_adb_host_bp'),
        ('host_control_routes', 'control_bp'),  # ✅ Unified naming
        ('host_remote_routes', 'remote_bp'),  # ✅ Unified naming
        ('host_av_routes', 'av_bp'),  # ✅ Unified naming
        ('host_navigation_routes', 'navigation_bp'),  # ✅ Navigation screenshots
    ]
    
    for module_name, blueprint_name in host_route_modules:
        try:
            module = __import__(f'src.web.routes.{module_name}', fromlist=[blueprint_name])
            blueprint = getattr(module, blueprint_name)
            app.register_blueprint(blueprint)
            print(f"   ✅ {module_name} -> {blueprint_name}")
            
        except ImportError as e:
            print(f"   ❌ CRITICAL: Failed to import {module_name}: {e}")
            raise
        except AttributeError as e:
            print(f"   ❌ CRITICAL: Blueprint {blueprint_name} not found in {module_name}: {e}")
            raise
    
    print("✅ ALL host routes registered successfully") 