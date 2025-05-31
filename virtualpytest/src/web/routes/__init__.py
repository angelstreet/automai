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
    app.register_blueprint(campaign_bp)
    app.register_blueprint(testcase_bp)
    app.register_blueprint(userinterface_bp)
    app.register_blueprint(devicemodel_bp)
    app.register_blueprint(screen_definition_blueprint, url_prefix='/api/virtualpytest/screen-definition') 