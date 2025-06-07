import sys
import os
import time
import subprocess
import psutil
import signal
import atexit
import hashlib
import threading
import requests
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

def load_environment_variables(mode='server'):
    """Load environment variables from mode-specific .env file"""
    if mode == 'server':
        env_filename = '.env.server'
    elif mode == 'host':
        env_filename = '.env.host'
    else:
        env_filename = '.env.local'  # fallback
    
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', env_filename)
    load_dotenv(env_path)
    
    # Debug: Log environment variable loading
    print(f"Loading environment variables from: {env_path}")
    print(f"File exists: {os.path.exists(env_path)}")
    print(f"Mode: {mode.upper()}")
    
    return env_path

def setup_paths():
    """Setup Python paths for imports"""
    # Add the parent directory to the path to allow imports
    parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sys.path.insert(0, parent_dir)  # Insert at beginning to prioritize over local utils

    # Add parent src/utils directory to path for supabase_utils and other utilities
    parent_utils_path = os.path.join(parent_dir, 'utils')
    sys.path.insert(0, parent_utils_path)

    # Add controllers directory to path
    controllers_path = os.path.join(parent_dir, 'controllers')
    sys.path.append(controllers_path)

    # Add web utils path specifically
    web_utils_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'utils')
    sys.path.insert(0, web_utils_path)

def kill_process_on_port(port):
    """Kill any process using the specified port"""
    try:
        print(f"🔍 [PORT] Checking for processes using port {port}...")
        
        # Get current process info to avoid killing ourselves or our parent
        current_pid = os.getpid()
        parent_pid = os.getppid() if hasattr(os, 'getppid') else None
        
        # Check if we're running under Flask's reloader
        is_reloader_env = os.environ.get('WERKZEUG_RUN_MAIN') == 'true'
        
        if is_reloader_env:
            print(f"🔄 [PORT] Flask reloader detected, skipping port cleanup to avoid conflicts")
            return
        
        # Find processes using the port
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                # Get process connections directly from the process object
                connections = proc.connections()
                if connections:
                    for conn in connections:
                        if hasattr(conn, 'laddr') and conn.laddr and conn.laddr.port == port:
                            pid = proc.info['pid']
                            name = proc.info['name']
                            
                            # Skip current process and parent process to avoid killing ourselves
                            if pid == current_pid:
                                print(f"🚫 [PORT] Skipping current process PID {pid} (self)")
                                continue
                            if parent_pid and pid == parent_pid:
                                print(f"🚫 [PORT] Skipping parent process PID {pid} (parent)")
                                continue
                            
                            print(f"🎯 [PORT] Found process using port {port}: PID {pid} ({name})")
                            
                            # Kill the process
                            try:
                                process = psutil.Process(pid)
                                process.terminate()  # Try graceful termination first
                                
                                # Wait up to 3 seconds for graceful termination
                                try:
                                    process.wait(timeout=3)
                                    print(f"✅ [PORT] Successfully terminated process PID {pid}")
                                except psutil.TimeoutExpired:
                                    # Force kill if graceful termination failed
                                    print(f"⚠️ [PORT] Graceful termination failed, force killing PID {pid}")
                                    process.kill()
                                    process.wait(timeout=1)
                                    print(f"💀 [PORT] Force killed process PID {pid}")
                                    
                            except psutil.NoSuchProcess:
                                print(f"ℹ️ [PORT] Process PID {pid} already terminated")
                            except psutil.AccessDenied:
                                print(f"❌ [PORT] Access denied when trying to kill PID {pid}")
                            except Exception as kill_error:
                                print(f"❌ [PORT] Error killing process PID {pid}: {kill_error}")
                                
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                # Process might have disappeared or we don't have access
                continue
            except Exception as proc_error:
                # Skip processes we can't inspect (e.g., no permission to get connections)
                continue
                
        print(f"✅ [PORT] Port {port} cleanup completed")
        
    except Exception as e:
        print(f"❌ [PORT] Error during port cleanup: {e}")
        # Fallback: try using lsof command if available (only if not in reloader)
        is_reloader_env = os.environ.get('WERKZEUG_RUN_MAIN') == 'true'
        if not is_reloader_env:
            try:
                print(f"🔄 [PORT] Trying fallback method with lsof...")
                import subprocess
                result = subprocess.run(['lsof', '-ti', f':{port}'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0 and result.stdout.strip():
                    pids = result.stdout.strip().split('\n')
                    current_pid = os.getpid()
                    parent_pid = os.getppid() if hasattr(os, 'getppid') else None
                    
                    for pid_str in pids:
                        try:
                            pid = int(pid_str.strip())
                            
                            # Skip current process and parent process
                            if pid == current_pid or (parent_pid and pid == parent_pid):
                                print(f"🚫 [PORT] Skipping PID {pid} (self or parent)")
                                continue
                                
                            print(f"🎯 [PORT] Found PID {pid} using port {port} (via lsof)")
                            process = psutil.Process(pid)
                            process.terminate()
                            try:
                                process.wait(timeout=3)
                                print(f"✅ [PORT] Successfully terminated PID {pid}")
                            except psutil.TimeoutExpired:
                                process.kill()
                                print(f"💀 [PORT] Force killed PID {pid}")
                        except (ValueError, psutil.NoSuchProcess, psutil.AccessDenied) as pid_error:
                            print(f"⚠️ [PORT] Could not kill PID {pid_str}: {pid_error}")
                else:
                    print(f"ℹ️ [PORT] No processes found using port {port} (via lsof)")
            except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
                print(f"⚠️ [PORT] lsof fallback method failed or not available")
            except Exception as fallback_error:
                print(f"❌ [PORT] Fallback method error: {fallback_error}")
        else:
            print(f"🔄 [PORT] Skipping lsof fallback due to reloader environment")

def get_host_system_stats():
    """Get current system statistics for host registration"""
    try:
        # CPU usage percentage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_used_gb = memory.used / (1024**3)
        memory_total_gb = memory.total / (1024**3)
        
        # Disk usage (root partition)
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        disk_used_gb = disk.used / (1024**3)
        disk_total_gb = disk.total / (1024**3)
        
        return {
            'cpu': {
                'percent': round(cpu_percent, 1)
            },
            'memory': {
                'percent': round(memory_percent, 1),
                'used_gb': round(memory_used_gb, 2),
                'total_gb': round(memory_total_gb, 2)
            },
            'disk': {
                'percent': round(disk_percent, 1),
                'used_gb': round(disk_used_gb, 2),
                'total_gb': round(disk_total_gb, 2)
            },
            'timestamp': time.time()
        }
    except Exception as e:
        print(f"⚠️ [HOST] Error getting system stats: {e}")
        return {
            'cpu': {'percent': 0},
            'memory': {'percent': 0, 'used_gb': 0, 'total_gb': 0},
            'disk': {'percent': 0, 'used_gb': 0, 'total_gb': 0},
            'timestamp': time.time(),
            'error': str(e)
        }

def setup_flask_app(app_name="VirtualPyTest"):
    """Setup and configure Flask application with CORS"""
    app = Flask(app_name)

    # Configure CORS to allow all origins for development
    CORS(app, 
         origins="*",  # Allow all origins
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "Accept"],
         supports_credentials=False  # Set to False when using origins="*"
    )

    # Initialize Flask app context variables for client registry
    with app.app_context():
        app._connected_clients = {}
        app._health_check_threads = {}

    return app

def setup_supabase_connection():
    """Setup Supabase connection"""
    try:
        from supabase_utils import get_supabase_client
        
        # Test the connection by checking if supabase client is available
        supabase_client = get_supabase_client()
        if supabase_client:
            print("Supabase connected successfully!")
            return supabase_client
        else:
            raise Exception("Supabase client not initialized")
    except Exception as e:
        print(f"Warning: Supabase connection failed: {e}")
        print("Starting Flask app without Supabase connection...")
        return None

def setup_controllers():
    """Setup VirtualPyTest controller system"""
    try:
        from controllers import ControllerFactory, CONTROLLER_REGISTRY, create_device_controllers
        from controllers.base_controllers import (
            RemoteControllerInterface, 
            AVControllerInterface, 
            VerificationControllerInterface,
            PowerControllerInterface
        )
        print("VirtualPyTest controller system imported successfully!")
        return True
    except Exception as e:
        print(f"Warning: VirtualPyTest controllers not available: {e}")
        return False

def validate_environment_variables(mode='server'):
    """Validate environment variables based on mode"""
    print("=" * 60)
    print("🔍 ENVIRONMENT VARIABLES ANALYSIS")
    print("=" * 60)

    print("Environment variables loaded:")
    print(f"  SERVER_IP: {os.getenv('SERVER_IP', 'NOT SET')}")
    print(f"  SERVER_PORT: {os.getenv('SERVER_PORT', 'NOT SET')}")
    print(f"  GITHUB_TOKEN: {'SET' if os.getenv('GITHUB_TOKEN') else 'NOT SET'}")

    if mode == 'host':
        print("\n🏠 HOST MODE ENVIRONMENT VALIDATION:")
        print("-" * 40)
        
        # Required environment variables for host mode
        required_host_vars = {
            'SERVER_IP': os.getenv('SERVER_IP'),
            'SERVER_PORT': os.getenv('SERVER_PORT'),
            'SERVER_PROTOCOL': os.getenv('SERVER_PROTOCOL'),
            'HOST_NAME': os.getenv('HOST_NAME'),
            'HOST_IP': os.getenv('HOST_IP'),
            'HOST_PROTOCOL': os.getenv('HOST_PROTOCOL'),
            'HOST_PORT_INTERNAL': os.getenv('HOST_PORT_INTERNAL'),
            'HOST_PORT_EXTERNAL': os.getenv('HOST_PORT_EXTERNAL'),
            'HOST_PORT_WEB': os.getenv('HOST_PORT_WEB'),
            'GITHUB_TOKEN': os.getenv('GITHUB_TOKEN')
        }
        
        missing_vars = []
        empty_vars = []
        
        for var_name, var_value in required_host_vars.items():
            status = "✅ SET" if var_value else "❌ NOT SET"
            display_value = var_value if var_name != 'GITHUB_TOKEN' else ('***' if var_value else 'NOT SET')
            print(f"  {var_name}: {display_value} ({status})")
            
            if not var_value:
                missing_vars.append(var_name)
            elif var_value.strip() == '':
                empty_vars.append(var_name)
        
        print("\n🔍 HOST MODE VALIDATION SUMMARY:")
        if missing_vars:
            print(f"❌ Missing required variables: {', '.join(missing_vars)}")
        if empty_vars:
            print(f"⚠️  Empty variables: {', '.join(empty_vars)}")
        
        if not missing_vars and not empty_vars:
            print("✅ All required host environment variables are set!")
        else:
            print("\n💡 To fix this, set the missing environment variables:")
            print("   Example:")
            for var in missing_vars + empty_vars:
                if var == 'SERVER_IP':
                    print(f"   export {var}=77.56.53.130")
                elif var == 'SERVER_PORT':
                    print(f"   export {var}=5119")
                elif var == 'SERVER_PROTOCOL':
                    print(f"   export {var}=http")
                elif var == 'HOST_NAME':
                    print(f"   export {var}=sunri-pi1")
                elif var == 'HOST_IP':
                    print(f"   export {var}=77.56.53.130")
                elif var == 'HOST_PROTOCOL':
                    print(f"   export {var}=http")
                elif var == 'HOST_PORT_INTERNAL':
                    print(f"   export {var}=5119")
                elif var == 'HOST_PORT_EXTERNAL':
                    print(f"   export {var}=5119")
                elif var == 'HOST_PORT_WEB':
                    print(f"   export {var}=444")
                elif var == 'GITHUB_TOKEN':
                    print(f"   export {var}=your_github_token")
            print(f"\n   Then run: python3 app_host.py")
            
            # Don't exit, but warn that registration will likely fail
            print("\n⚠️  WARNING: Host registration will likely fail with missing variables!")

    elif mode == 'server':
        print("\n🖥️  SERVER MODE ENVIRONMENT VALIDATION:")
        print("-" * 40)
        
        # Required environment variables for server mode
        required_server_vars = {
            'SERVER_IP': os.getenv('SERVER_IP'),
            'SERVER_PORT': os.getenv('SERVER_PORT'),
            'GITHUB_TOKEN': os.getenv('GITHUB_TOKEN')
        }
        
        missing_vars = []
        
        for var_name, var_value in required_server_vars.items():
            status = "✅ SET" if var_value else "❌ NOT SET"
            display_value = var_value if var_name != 'GITHUB_TOKEN' else ('***' if var_value else 'NOT SET')
            print(f"  {var_name}: {display_value} ({status})")
            
            if not var_value:
                missing_vars.append(var_name)
        
        if missing_vars:
            print(f"\n⚠️  Missing server variables: {', '.join(missing_vars)}")
        else:
            print("\n✅ All required server environment variables are set!")

    print("=" * 60)

def generate_stable_host_id(host_name, host_ip):
    """Generate a stable host ID based on host name and IP"""
    stable_id_string = f"{host_name}-{host_ip}"
    return hashlib.md5(stable_id_string.encode()).hexdigest()

# Global session storage for various controllers
def initialize_global_sessions():
    """Initialize global session storage for controllers"""
    return {
        'android_tv_session': {
            'controller': None,
            'connected': False,
            'connection_details': {}
        },
        'ir_remote_session': {
            'controller': None,
            'connected': False,
            'connection_details': {}
        },
        'bluetooth_remote_session': {
            'controller': None,
            'connected': False,
            'connection_details': {}
        },
        'android_mobile_controller': None
    }

# Constants
DEFAULT_TEAM_ID = "7fdeb4bb-3639-4ec3-959f-b54769a219ce"  # Hardcoded team ID
DEFAULT_USER_ID = "eb6cfd93-44ab-4783-bd0c-129b734640f3"   # Hardcoded user ID 