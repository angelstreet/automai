"""
Routes package for VirtualPyTest Web API

This package contains organized route modules for the Flask application.
"""

from flask import Flask
from flask_cors import CORS

from .core_routes import core_bp
from .device_routes import device_bp
from .controller_routes import controller_bp
from .remote_routes import remote_bp
from .audiovideo_routes import audiovideo_bp
from .stats_routes import stats_bp
from .navigation_routes import navigation_bp
from .campaign_routes import campaign_bp
from .testcase_routes import testcase_bp
from .userinterface_routes import userinterface_bp
from .devicemodel_routes import devicemodel_bp
from .screen_definition_routes import screen_definition_blueprint
from .pathfinding_routes import pathfinding_bp
from .validation_routes import validation_bp

# Import original verification routes (contains take-control endpoint)
from .verification_routes import verification_bp

# Import separated verification blueprints
from .verification_common_routes import verification_common_bp
from .verification_image_host_routes import verification_image_host_bp
from .verification_text_host_routes import verification_text_host_bp
from .verification_adb_host_routes import verification_adb_host_bp
from .verification_image_server_routes import verification_image_server_bp
from .verification_text_server_routes import verification_text_server_bp
from .verification_adb_server_routes import verification_adb_server_bp
from .verification_execution_host_routes import verification_execution_host_bp
from .verification_execution_server_routes import verification_execution_server_bp

from .power_routes import power_bp
from .system_routes import system_bp

def register_routes(app: Flask):
    """Register all application routes"""
    CORS(app)
    
    # Register all blueprints
    app.register_blueprint(core_bp)
    app.register_blueprint(device_bp)
    app.register_blueprint(controller_bp)
    app.register_blueprint(remote_bp)
    app.register_blueprint(audiovideo_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(navigation_bp)
    app.register_blueprint(pathfinding_bp)
    app.register_blueprint(validation_bp)
    app.register_blueprint(campaign_bp)
    app.register_blueprint(testcase_bp)
    app.register_blueprint(userinterface_bp)
    app.register_blueprint(devicemodel_bp)
    
    # Register original verification blueprint (contains take-control endpoint)
    app.register_blueprint(verification_bp)
    
    # Register separated verification blueprints
    app.register_blueprint(verification_common_bp)
    app.register_blueprint(verification_image_host_bp)
    app.register_blueprint(verification_text_host_bp)
    app.register_blueprint(verification_adb_host_bp)
    app.register_blueprint(verification_image_server_bp)
    app.register_blueprint(verification_text_server_bp)
    app.register_blueprint(verification_adb_server_bp)
    app.register_blueprint(verification_execution_host_bp)
    app.register_blueprint(verification_execution_server_bp)
    
    app.register_blueprint(screen_definition_blueprint, url_prefix='/api/virtualpytest/screen-definition')
    app.register_blueprint(power_bp)
    app.register_blueprint(system_bp) 