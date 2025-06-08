"""
Verification Control Server Routes

This module has been simplified to remove all device control and locking functionality.
Device locking is now handled exclusively by server_control_routes.py.
"""

from flask import Blueprint

# Create blueprint (kept for compatibility but no routes defined)
verification_control_server_bp = Blueprint('verification_control_server', __name__)

# =====================================================
# ALL VERIFICATION CONTROL ROUTES REMOVED
# =====================================================

# The following endpoints have been removed and their functionality moved to server_control_routes.py:
# - /api/virtualpytest/verification/lock-device (POST)
# - /api/virtualpytest/verification/unlock-device (POST) 
# - /api/virtualpytest/verification/device-lock-status/<device_id> (GET)
# - /api/virtualpytest/verification/take-control (POST)
# - /api/virtualpytest/verification/release-control (POST)

# Device locking and control is now handled exclusively by:
# - server_control_routes.py for main device control
# - host_control_routes.py for host-side resource checking

# This blueprint is kept registered for compatibility but contains no active routes. 