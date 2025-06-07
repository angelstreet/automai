# Server-specific utilities for managing connected clients and health checks

# Global client registry for server mode
connected_clients = {}
health_check_threads = {}

def initialize_server_globals():
    """Initialize server-specific global variables"""
    global connected_clients, health_check_threads
    connected_clients = {}
    health_check_threads = {}
    print("🖥️  Server mode: Ready to accept host registrations")

def get_connected_clients():
    """Get the dictionary of connected clients"""
    return connected_clients

def get_health_check_threads():
    """Get the dictionary of health check threads"""
    return health_check_threads

def add_connected_client(client_id, client_info):
    """Add a client to the connected clients registry"""
    connected_clients[client_id] = client_info
    print(f"📝 [SERVER] Added client {client_id[:8]}... to registry")

def remove_connected_client(client_id):
    """Remove a client from the connected clients registry"""
    if client_id in connected_clients:
        del connected_clients[client_id]
        print(f"🗑️ [SERVER] Removed client {client_id[:8]}... from registry")

def update_client_info(client_id, client_info):
    """Update client information in the registry"""
    if client_id in connected_clients:
        connected_clients[client_id].update(client_info)
        print(f"🔄 [SERVER] Updated client {client_id[:8]}... info")

def get_client_info(client_id):
    """Get information for a specific client"""
    return connected_clients.get(client_id)

def cleanup_server_resources():
    """Cleanup server resources on shutdown"""
    print(f"\n🧹 [SERVER] Cleaning up server resources...")
    
    # Stop all health check threads
    for client_id, thread in health_check_threads.items():
        if thread and thread.is_alive():
            print(f"🛑 [SERVER] Stopping health check thread for client {client_id[:8]}...")
            # Note: In a real implementation, you'd want to properly signal threads to stop
    
    # Clear registries
    connected_clients.clear()
    health_check_threads.clear()
    
    print(f"✅ [SERVER] Server cleanup completed") 