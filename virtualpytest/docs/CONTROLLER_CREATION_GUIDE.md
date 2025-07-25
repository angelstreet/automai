# Controller Creation Guide

This guide provides step-by-step instructions for creating new controllers in the VirtualPyTest system.

## Overview

The VirtualPyTest controller system uses a factory pattern with these main components:

- **Base Controllers**: Abstract interfaces that define common functionality
- **Implementation Controllers**: Concrete implementations for specific technologies
- **Factory Configuration**: Mapping of device types to available controllers
- **Controller Manager**: Creates and manages controller instances
- **Registry**: Central registration of all available controller implementations

## Controller Types

The system supports these controller types:

- **Remote**: Device interaction (ADB, Appium, IR, Bluetooth)
- **AV**: Audio/Video capture (HDMI, VNC, Camera streams)
- **Desktop**: Command execution and GUI automation (Bash, PyAutoGUI)
- **Web**: Web browser automation (Playwright, Selenium)
- **Power**: Device power control (Tapo smart plugs)
- **Verification**: Content verification (OCR, Image matching, ADB)
- **AI**: AI-powered task execution

## Step-by-Step Controller Creation

### 1. Create the Controller Implementation

Create a new file in the appropriate subdirectory of `src/controllers/`:

```
src/controllers/
├── remote/          # Remote control implementations
├── audiovideo/      # Audio/Video capture implementations
├── desktop/         # Desktop automation implementations
├── web/             # Web automation implementations
├── power/           # Power control implementations
├── verification/    # Verification implementations
└── ai/              # AI implementations
```

**Example**: `src/controllers/desktop/pyautogui.py`

```python
"""
PyAutoGUI Desktop Controller Implementation

This controller provides PyAutoGUI cross-platform GUI automation functionality.
Works on Windows, Linux, and ARM (Raspberry Pi) - assumes PyAutoGUI is installed.
"""

from typing import Dict, Any, List, Optional
import time
from ..base_controller import DesktopControllerInterface

try:
    import pyautogui
    # Configure PyAutoGUI safety features
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.1
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False


class PyAutoGUIDesktopController(DesktopControllerInterface):
    """PyAutoGUI desktop controller for cross-platform GUI automation."""

    def __init__(self, **kwargs):
        """Initialize the PyAutoGUI desktop controller."""
        super().__init__("PyAutoGUI Desktop", "pyautogui")

        # Command execution state
        self.last_command_output = ""
        self.last_command_error = ""
        self.last_exit_code = 0

        if not PYAUTOGUI_AVAILABLE:
            print(f"[@controller:PyAutoGUIDesktop] WARNING: PyAutoGUI not available")
        else:
            print(f"[@controller:PyAutoGUIDesktop] Initialized for GUI automation")

    def connect(self) -> bool:
        """Connect to PyAutoGUI service."""
        if not PYAUTOGUI_AVAILABLE:
            print(f"Desktop[{self.desktop_type.upper()}]: ERROR - PyAutoGUI not available")
            return False

        print(f"Desktop[{self.desktop_type.upper()}]: GUI automation ready")
        return True

    def disconnect(self) -> bool:
        """Disconnect from PyAutoGUI service."""
        print(f"Desktop[{self.desktop_type.upper()}]: GUI automation disconnected")
        return True

    def execute_command(self, command: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute PyAutoGUI command for GUI automation."""
        # Implementation details...
        pass
```

### 2. Update the Controller Package `__init__.py`

Add your controller to the package's `__init__.py` file:

**File**: `src/controllers/desktop/__init__.py`

```python
from .bash import BashDesktopController
from .pyautogui import PyAutoGUIDesktopController  # Add this line

__all__ = [
    'BashDesktopController',
    'PyAutoGUIDesktopController'  # Add this line
]
```

### 3. Update the Factory Configuration

Add your controller to the device-controller mapping:

**File**: `src/controllers/controller_config_factory.py`

```python
# Add new device model or update existing ones
DEVICE_CONTROLLER_MAP = {
    'host_pyautogui': {
        'av': ['vnc_stream'],
        'remote': [],
        'desktop': ['pyautogui'],  # Add your controller here
        'web': ['playwright'],
        'power': [],
        'network': [],
        'ai': ['ai_agent']
    }
}

# Add parameter configuration function
def _get_desktop_params(implementation: str, device_config: dict) -> dict:
    """Get parameters for Desktop controllers."""
    if implementation == 'pyautogui':
        params = {}  # Add any initialization parameters needed
        return params
    # ... existing implementations
```

### 4. Update the Controller Manager

Add import and instance creation logic:

**File**: `src/controllers/controller_manager.py`

```python
# Add import
from ..controllers.desktop.pyautogui import PyAutoGUIDesktopController

def _create_controller_instance(controller_type: str, implementation: str, params: Dict[str, Any]):
    """Create a controller instance based on type and implementation."""

    # Desktop Controllers
    elif controller_type == 'desktop':
        if implementation == 'bash':
            return BashDesktopController(**params)
        elif implementation == 'pyautogui':  # Add this
            return PyAutoGUIDesktopController(**params)
```

### 5. Update the Main Controller Registry

Add your controller to the central registry:

**File**: `src/controllers/__init__.py`

```python
# Add import
from .desktop.pyautogui import PyAutoGUIDesktopController

# Add to registry
CONTROLLER_REGISTRY = {
    'desktop': {
        'bash': BashDesktopController,
        'pyautogui': PyAutoGUIDesktopController,  # Add this line
    },
    # ... other controller types
}
```

### 6. Command Structure Guidelines

#### Command Naming Convention

- Use descriptive command names: `execute_{type}_{action}`
- Examples:
  - `execute_pyautogui_click`
  - `execute_pyautogui_keypress`
  - `execute_bash_command`

#### Parameter Structure

Always use a dictionary with descriptive keys:

```python
# Good
params = {
    'x': 100,
    'y': 200,
    'button': 'left'
}

# Bad
params = [100, 200, 'left']
```

#### Return Value Structure

Always return a consistent dictionary:

```python
return {
    'success': bool,           # True if command executed successfully
    'output': str,             # Command output or result description
    'error': str,              # Error message if failed (empty if success)
    'exit_code': int,          # 0 for success, -1 or error code for failure
    'execution_time': int      # Execution time in milliseconds
}
```

### 7. Error Handling Best Practices

#### Dependency Checking

Always check for optional dependencies at import time:

```python
try:
    import pyautogui
    DEPENDENCY_AVAILABLE = True
except ImportError:
    DEPENDENCY_AVAILABLE = False
```

#### Graceful Degradation

Handle missing dependencies gracefully:

```python
def connect(self) -> bool:
    if not DEPENDENCY_AVAILABLE:
        print(f"Controller[TYPE]: ERROR - Required dependency not available")
        return False
    return True
```

#### Exception Handling

Wrap command execution in try-catch blocks:

```python
try:
    # Execute command
    result = some_operation()
    return self._success_result(f"Operation completed: {result}", start_time)
except SpecificException as e:
    return self._error_result(f"Specific error: {e}", start_time)
except Exception as e:
    return self._error_result(f"Unexpected error: {e}", start_time)
```

### 8. Testing Your Controller

#### Basic Functionality Test

Create a simple test to verify your controller works:

```python
# Test script
from virtualpytest.src.controllers.desktop.pyautogui import PyAutoGUIDesktopController

controller = PyAutoGUIDesktopController()
if controller.connect():
    result = controller.execute_command('execute_pyautogui_click', {'x': 100, 'y': 100})
    print(f"Test result: {result}")
    controller.disconnect()
```

#### Integration Test

Test through the factory system:

```python
from virtualpytest.src.controllers.controller_manager import get_host

host = get_host()
device = host.get_device('device_id')
desktop_controller = device.get_controller('desktop')
result = desktop_controller.execute_command('execute_pyautogui_click', {'x': 100, 'y': 100})
```

#### Route Testing

**Test Generic Routes** (for most controller implementations):

```bash
# Test host route directly
curl -X POST http://localhost:6109/host/desktop/executeCommand \
  -H "Content-Type: application/json" \
  -d '{
    "command": "execute_pyautogui_click",
    "params": {"x": 100, "y": 200}
  }'

# Test server route (proxies to host)
curl -X POST http://localhost:3000/server/desktop/executeCommand \
  -H "Content-Type: application/json" \
  -d '{
    "command": "execute_pyautogui_click", 
    "params": {"x": 100, "y": 200},
    "host": {"host_url": "http://localhost:6109", "device_id": "host"}
  }'
```

**Verify Route Registration:**

Check that your routes appear in the registered routes:
```bash
# Check if routes are registered
curl http://localhost:6109/host/health
curl http://localhost:3000/server/health
```

**Test Error Handling:**

```bash
# Test missing command
curl -X POST http://localhost:6109/host/desktop/executeCommand \
  -H "Content-Type: application/json" \
  -d '{"params": {"x": 100}}'

# Test invalid command
curl -X POST http://localhost:6109/host/desktop/executeCommand \
  -H "Content-Type: application/json" \
  -d '{
    "command": "invalid_command",
    "params": {}
  }'
```

## Common Patterns

### 1. State Management

Controllers should track their execution state:

```python
def __init__(self, **kwargs):
    super().__init__("Controller Name", "controller_type")
    self.last_command_output = ""
    self.last_command_error = ""
    self.last_exit_code = 0
```

### 2. Helper Methods

Create helper methods for common result patterns:

```python
def _success_result(self, output: str, start_time: float) -> Dict[str, Any]:
    """Helper to create success result."""
    execution_time = int((time.time() - start_time) * 1000)
    self.last_command_output = output
    self.last_command_error = ""
    self.last_exit_code = 0

    return {
        'success': True,
        'output': output,
        'error': '',
        'exit_code': 0,
        'execution_time': execution_time
    }

def _error_result(self, error: str, start_time: float) -> Dict[str, Any]:
    """Helper to create error result."""
    execution_time = int((time.time() - start_time) * 1000)
    self.last_command_output = ""
    self.last_command_error = error
    self.last_exit_code = -1

    return {
        'success': False,
        'output': '',
        'error': error,
        'exit_code': -1,
        'execution_time': execution_time
    }
```

### 3. Logging

Use consistent logging patterns:

```python
print(f"[@controller:ControllerName] Initialization message")
print(f"Controller[{self.controller_type.upper()}]: Status message")
print(f"Controller[{self.controller_type.upper()}]: Executing command: {command}")
```

## Routes and Endpoints

### Route Architecture Patterns

There are two main patterns for controller routes in the system:

#### Pattern 1: Generic Routes (Legacy)
- Single route handles multiple controller implementations  
- Routes to first available controller of that type
- **Example**: `/host/desktop/executeCommand` (gets first desktop controller)

#### Pattern 2: Dedicated Routes (Recommended - Following Verification Pattern)
- Separate routes for each controller implementation
- Direct routing to specific controller type  
- **Example**: `/host/desktop/bash/executeCommand`, `/host/desktop/pyautogui/executeCommand`
- **Benefits**: Guaranteed routing, better error handling, clearer architecture

### Dedicated Routes for Desktop Controllers (Current Pattern)

Following the verification system architecture, desktop controllers now use dedicated routes:

#### Bash Desktop Controller
- **Host Route**: `/host/desktop/bash/executeCommand`
- **Server Route**: `/server/desktop/bash/executeCommand`
- **Files**: `host_desktop_bash_routes.py`, `server_desktop_bash_routes.py`

#### PyAutoGUI Desktop Controller  
- **Host Route**: `/host/desktop/pyautogui/executeCommand`
- **Server Route**: `/server/desktop/pyautogui/executeCommand`
- **Files**: `host_desktop_pyautogui_routes.py`, `server_desktop_pyautogui_routes.py`

**Note**: The generic `/server/desktop/executeCommand` and `/host/desktop/executeCommand` routes have been removed to follow the verification pattern properly.

### Generic Routes (Usually Already Exist)

Most controller types have **generic routes** that work with any implementation of that type. These routes use the standard `controller.execute_command(command, params)` interface.

**Existing Generic Routes by Controller Type:**

- **Remote**: ✅ Already exists
  - Host: `/host/remote/executeCommand`
  - Server: `/server/remote/executeCommand`
- **Web**: ✅ Already exists
  - Host: `/host/web/executeCommand` 
  - Server: `/server/web/executeCommand`
- **AV**: ✅ Already exists (capture endpoints)
- **Power**: ✅ Already exists
  - Host: `/host/power/executeCommand`
  - Server: `/server/power/executeCommand`
- **AI**: ✅ Already exists
  - Host: `/host/aiagent/executeCommand`
  - Server: `/server/aiagent/executeCommand`

### When to Use Which Pattern

**✅ Use Dedicated Routes When (Recommended):**
- Multiple controller implementations for the same type (like Desktop: bash + pyautogui)
- Need guaranteed routing to specific controller
- Want to follow verification system architecture
- Better error handling and debugging

**✅ Use Generic Routes When:**
- Single controller implementation for that type
- Simple use cases  
- Backward compatibility needed

**🛠️ Create Completely New Routes When:**
- You're creating a completely new controller type
- You need specialized endpoints beyond the generic `executeCommand`
- You need custom parameter handling or response formatting

### Creating New Routes (If Needed)

If you need to create new routes for a new controller type, follow this pattern:

#### 1. Create Host Routes

Create `src/web/routes/host_{type}_routes.py`:

```python
"""
Host {Type} Routes

Host-side {type} control endpoints that execute commands using instantiated {type} controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller

# Create blueprint
host_{type}_bp = Blueprint('host_{type}', __name__, url_prefix='/host/{type}')

@host_{type}_bp.route('/executeCommand', methods=['POST'])
def execute_command():
    """Execute a {type} command using {type} controller."""
    try:
        # Get request data
        data = request.get_json() or {}
        command = data.get('command')
        params = data.get('params', {})
        
        if not command:
            return jsonify({
                'success': False,
                'error': 'command is required'
            }), 400
        
        # Get {type} controller
        {type}_controller = get_controller(None, '{type}')
        
        if not {type}_controller:
            return jsonify({
                'success': False,
                'error': 'No {type} controller found'
            }), 404
        
        # Execute command using standard interface
        result = {type}_controller.execute_command(command, params)
        
        return jsonify(result)
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Command execution error: {str(e)}'
        }), 500
```

#### 2. Create Server Routes

Create `src/web/routes/server_{type}_routes.py`:

```python
"""
Server {Type} Routes

Server-side {type} control proxy endpoints that forward requests to host {type} controllers.
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint
server_{type}_bp = Blueprint('server_{type}', __name__, url_prefix='/server/{type}')

@server_{type}_bp.route('/executeCommand', methods=['POST'])
def execute_command():
    """Proxy execute {type} command request to selected host"""
    try:
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/{type}/executeCommand', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

#### 3. Register Routes

Add to `src/web/routes/__init__.py`:

```python
# In _register_host_routes function
host_route_modules = [
    # ... existing routes
    ('host_{type}_routes', 'host_{type}_bp'),  # Add this line
]

# In _register_server_routes function  
server_route_modules = [
    # ... existing routes
    ('server_{type}_routes', 'server_{type}_bp'),  # Add this line
]
```

## File Checklist

When creating a new controller, ensure you update these files:

### Core Controller Files (Always Required)
- [ ] **Controller Implementation**: `src/controllers/{type}/{name}.py`
- [ ] **Package Init**: `src/controllers/{type}/__init__.py`
- [ ] **Factory Config**: `src/controllers/controller_config_factory.py`
  - [ ] Add to `DEVICE_CONTROLLER_MAP`
  - [ ] Add parameter function `_get_{type}_params()`
- [ ] **Controller Manager**: `src/controllers/controller_manager.py`
  - [ ] Add import statement
  - [ ] Add to `_create_controller_instance()`
- [ ] **Main Registry**: `src/controllers/__init__.py`
  - [ ] Add import statement
  - [ ] Add to `CONTROLLER_REGISTRY`

### Routes and Backend (Check if needed)
- [ ] **Host Routes**: `src/web/routes/host_{type}_routes.py` (if new controller type)
- [ ] **Server Routes**: `src/web/routes/server_{type}_routes.py` (if new controller type)
- [ ] **Route Registration**: `src/web/routes/__init__.py` (if new routes created)
- [ ] **Test Existing Routes**: Verify generic routes work with your controller

### Frontend Integration (Optional but Recommended)
- [ ] **UI Components**: `src/web/components/controller/{type}/` (for user interface)
- [ ] **Hooks**: `src/web/hooks/controller/use{Name}.ts` (for state management)
- [ ] **Panel Integration**: Update relevant panels to support new controller
- [ ] **Controller Config**: Add to `src/web/hooks/controller/useControllerConfig.ts`

## Environment Configuration

Controllers are configured through environment variables. Document the required variables for your controller:

```bash
# Example for device using PyAutoGUI
DEVICE1_NAME="Test Device"
DEVICE1_MODEL="host_pyautogui"
HOST_VNC_STREAM_PATH="http://localhost:5900"
HOST_VIDEO_CAPTURE_PATH="/var/www/html/vnc/captures"
```

## Best Practices Summary

1. **Follow Naming Conventions**: Use descriptive, consistent naming
2. **Handle Dependencies**: Always check for optional imports
3. **Consistent Returns**: Use the standard result dictionary format
4. **Error Handling**: Provide clear, actionable error messages
5. **Documentation**: Document command parameters and return values
6. **Testing**: Test both standalone and integrated functionality
7. **Logging**: Use consistent logging patterns for debugging
8. **Compatibility**: Consider cross-platform compatibility when possible

Following this guide ensures your controller integrates seamlessly with the VirtualPyTest system and provides a consistent experience for users.
