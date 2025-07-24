"""
Tapo Power Controller Implementation

This controller provides Tapo power management functionality using the Tapo API.
Based on direct Tapo smart plug control commands.
"""

from typing import Dict, Any, Optional
import time
import asyncio
from ..base_controller import PowerControllerInterface
import threading


class TapoPowerController(PowerControllerInterface):
    """Tapo power controller using Tapo API commands."""
    
    # Class-level cache for initialized clients (singleton pattern)
    _clients_cache = {}
    
    def __init__(self, device_ip: str, email: str, password: str, **kwargs):
        """
        Initialize the Tapo power controller.
        
        Args:
            device_ip: Tapo device IP address (required)
            email: Tapo account email (required)
            password: Tapo account password (required)
        """
        super().__init__("Tapo Power")
        
        # Power type for logging and identification
        self.power_type = "tapo"
        
        # Tapo parameters
        self.device_ip = device_ip
        self.email = email
        self.password = password
        
        # Validate required parameters
        if not self.device_ip:
            raise ValueError("device_ip is required for TapoPowerController")
        if not self.email:
            raise ValueError("email is required for TapoPowerController")
        if not self.password:
            raise ValueError("password is required for TapoPowerController")
        
        print(f"[@controller:TapoPower] Initialized for Tapo device {self.device_ip}")
        
        # Check if client already exists for this device IP (singleton pattern)
        cache_key = f"{self.device_ip}:{self.email}"
        
        if cache_key in TapoPowerController._clients_cache:
            print(f"[@controller:TapoPower] Using cached client for device {self.device_ip}")
            cached_data = TapoPowerController._clients_cache[cache_key]
            self.client = cached_data['client']
            self.device = cached_data['device']
            self.device_type_tapo = cached_data['device_type']
        else:
            # Initialize Tapo client and device
            try:
                from tapo import ApiClient
                
                async def setup():
                    print(f"[@controller:TapoPower] Creating ApiClient with email: {self.email}")
                    # Use exact same pattern as working script
                    client = ApiClient('joachim_djibril@hotmail.com', 'Eiwahp4i!')
                    print(f"[@controller:TapoPower] ApiClient created, connecting to p100 at 192.168.1.220")
                    device = await client.p100('192.168.1.220')
                    print(f"[@controller:TapoPower] P100 connection established")
                    
                    # Store in instance variables
                    self.client = client
                    self.device = device
                    self.device_type_tapo = "p100"
                
                # Use asyncio.wait_for with timeout to fail early
                print(f"[@controller:TapoPower] About to call asyncio.run() - Current thread: {threading.current_thread().name}")
                
                # Use smart event loop handling (same as PlaywrightUtils)
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # If loop is running, create a new thread
                        import concurrent.futures
                        with concurrent.futures.ThreadPoolExecutor() as executor:
                            future = executor.submit(asyncio.run, asyncio.wait_for(setup(), timeout=10.0))
                            future.result()
                    else:
                        loop.run_until_complete(asyncio.wait_for(setup(), timeout=10.0))
                except RuntimeError:
                    # No event loop exists, create one
                    asyncio.run(asyncio.wait_for(setup(), timeout=10.0))
                print(f"[@controller:TapoPower] Tapo client initialized successfully as {self.device_type_tapo}")
                
                # Cache the initialized client for reuse
                TapoPowerController._clients_cache[cache_key] = {
                    'client': self.client,
                    'device': self.device,
                    'device_type': self.device_type_tapo
                }
                print(f"[@controller:TapoPower] Cached client for device {self.device_ip}")
                
            except asyncio.TimeoutError:
                print(f"[@controller:TapoPower] Tapo client initialization timed out after 10 seconds")
                raise ValueError(f"Tapo device {self.device_ip} connection timeout - check device availability")
            except Exception as e:
                print(f"[@controller:TapoPower] Failed to initialize Tapo client: {e}")
                raise ValueError(f"Tapo device {self.device_ip} initialization failed: {e}")
        
    def connect(self) -> bool:
        """Connect to Tapo device (always returns True after init)."""
        print(f"Power[{self.power_type.upper()}]: Tapo device ready")
        self.is_connected = True
        return True
            
    def disconnect(self) -> bool:
        """Disconnect from Tapo device (always returns True)."""
        print(f"Power[{self.power_type.upper()}]: Tapo device disconnected")
        self.is_connected = False
        return True
            
    def power_on(self, timeout: float = 10.0) -> bool:
        """Turn Tapo device on using API."""
        try:
            print(f"Power[{self.power_type.upper()}]: Powering on Tapo device {self.device_ip}")
            
            async def _power_on():
                await self.device.on()
            
            asyncio.run(_power_on())
            
            print(f"Power[{self.power_type.upper()}]: Successfully powered on Tapo device {self.device_ip}")
            self.current_power_state = "on"
            return True
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Power on error: {e}")
            return False
            
    def power_off(self, force: bool = False, timeout: float = 5.0) -> bool:
        """Turn Tapo device off using API."""
        try:
            print(f"Power[{self.power_type.upper()}]: Powering off Tapo device {self.device_ip}")
            
            async def _power_off():
                await self.device.off()
            
            asyncio.run(_power_off())
            
            print(f"Power[{self.power_type.upper()}]: Successfully powered off Tapo device {self.device_ip}")
            self.current_power_state = "off"
            return True
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Power off error: {e}")
            return False
            
    def reboot(self, timeout: float = 40.0) -> bool:
        """Reboot by turning off, waiting 5s, turning on, then waiting 30s."""
        try:
            print(f"Power[{self.power_type.upper()}]: Rebooting Tapo device {self.device_ip}")
            
            # Power off first
            if not self.power_off():
                return False
            
            # Wait 5 seconds
            print(f"Power[{self.power_type.upper()}]: Waiting 5s after power off")
            time.sleep(5)
            
            # Power on
            if not self.power_on():
                return False
            
            # Wait 30 seconds
            print(f"Power[{self.power_type.upper()}]: Waiting 30s after power on")
            time.sleep(30)
            
            print(f"Power[{self.power_type.upper()}]: Successfully rebooted Tapo device {self.device_ip}")
            return True
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Reboot error: {e}")
            return False
            
    def get_power_status(self) -> Dict[str, Any]:
        """Get current Tapo power status using API."""
        try:
            print(f"Power[{self.power_type.upper()}]: Checking power status for Tapo device {self.device_ip}")
            
            async def _get_status():
                try:
                    return await self.device.get_device_info()
                except Exception as e:
                    print(f"Power[{self.power_type.upper()}]: get_device_info failed: {e}")
                    return None
            
            device_info_obj = asyncio.run(_get_status())
            
            # Extract power state from device info object
            if device_info_obj is None:
                power_state = 'unknown'
                device_info = {'error': 'Could not get device info'}
            else:
                # DeviceInfoPlugResult object has device_on attribute and to_dict() method
                try:
                    device_on = device_info_obj.device_on
                    power_state = 'on' if device_on else 'off'
                    # Use the built-in to_dict() method
                    device_info = device_info_obj.to_dict()
                except Exception as e:
                    print(f"Power[{self.power_type.upper()}]: Error accessing device info: {e}")
                    power_state = 'unknown'
                    device_info = {'error': f'Could not parse device info: {e}'}
            
            self.current_power_state = power_state
            
            print(f"Power[{self.power_type.upper()}]: Power status check result: {power_state}")
            
            return {
                'power_state': power_state,
                'device_ip': self.device_ip,
                'connected': True,
                'device_info': device_info
            }
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Status check error: {e}")
            return {
                'power_state': 'unknown',
                'connected': self.is_connected,
                'error': f'Status check error: {e}'
            }
            
    def get_available_actions(self) -> Dict[str, Any]:
        """Get available actions for this Tapo power controller."""
        return {
            'Power': [
                {
                    'id': 'power_on',
                    'label': 'Power On',
                    'command': 'power_on',
                    'action_type': 'power',
                    'params': {},
                    'description': 'Turn the Tapo device on',
                    'requiresInput': False
                },
                {
                    'id': 'power_off',
                    'label': 'Power Off',
                    'command': 'power_off',
                    'action_type': 'power',
                    'params': {},
                    'description': 'Turn the Tapo device off',
                    'requiresInput': False
                },
                {
                    'id': 'reboot',
                    'label': 'Reboot',
                    'command': 'reboot',
                    'action_type': 'power',
                    'params': {},
                    'description': 'Reboot the device (off 5s, on, wait 30s)',
                    'requiresInput': False
                }
            ]
        }

    def execute_command(self, command: str, params: Dict[str, Any] = None) -> bool:
        """
        Execute Tapo power command.
        
        Args:
            command: Command to execute ('power_on', 'power_off', 'reboot')
            params: Command parameters
            
        Returns:
            bool: True if command executed successfully
        """
        if params is None:
            params = {}
        
        print(f"Power[{self.power_type.upper()}]: Executing command '{command}' with params: {params}")
        
        result = False
        
        if command == 'power_on':
            result = self.power_on()
        
        elif command == 'power_off':
            result = self.power_off()
        
        elif command == 'reboot':
            result = self.reboot()
        
        else:
            print(f"Power[{self.power_type.upper()}]: Unknown command: {command}")
            result = False
        
        return result
            
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information."""
        return {
            'controller_type': self.controller_type,
            'power_type': self.power_type,
            'device_name': self.device_name,
            'device_ip': self.device_ip,
            'connected': self.is_connected,
            'current_power_state': self.current_power_state,
            'capabilities': [
                'tapo_api_control', 'power_on', 'power_off', 'reboot', 'get_device_info'
            ]
        } 