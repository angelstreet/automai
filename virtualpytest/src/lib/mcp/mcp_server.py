#!/usr/bin/env python3
"""
VirtualPyTest MCP Server

Model Context Protocol (MCP) server for VirtualPyTest device automation platform.
Allows LLMs to control web application navigation and device automation.
"""

import asyncio
import json
import logging
import sys
import os
from typing import Any, Dict, List
from urllib.parse import urljoin
import requests

# Add project root to path
current_dir = os.path.dirname(os.path.abspath(__file__))  # /virtualpytest/src/lib/mcp
lib_dir = os.path.dirname(current_dir)  # /virtualpytest/src/lib
src_dir = os.path.dirname(lib_dir)  # /virtualpytest/src
project_root = os.path.dirname(src_dir)  # /virtualpytest

# Add project root to path so we can import src as a package
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# MCP imports
try:
    import mcp.types as types
    from mcp.server import NotificationOptions, Server
    from mcp.server.models import InitializationOptions
except ImportError:
    print("Error: MCP library not found. Install with: pip install mcp")
    sys.exit(1)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("virtualpytest-mcp")

# Load tools configuration
def load_tools_config() -> Dict[str, Any]:
    """Load tools configuration from JSON file"""
    config_path = os.path.join(current_dir, "tools_config.json")
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Tools config file not found: {config_path}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in tools config: {e}")
        raise

# Configuration
TOOLS_CONFIG = load_tools_config()
VIRTUALPYTEST_BASE_URL = os.getenv("VIRTUALPYTEST_BASE_URL", "http://localhost:5000")

# Initialize MCP server
server = Server("virtualpytest-mcp-server")

@server.list_tools()
async def handle_list_tools() -> List[types.Tool]:
    """Return list of available tools"""
    tools = []
    
    for category_name, category_data in TOOLS_CONFIG["categories"].items():
        for tool_config in category_data["tools"]:
            # Convert parameters to MCP tool schema
            input_schema = {
                "type": "object",
                "properties": {},
                "required": []
            }
            
            for param_name, param_config in tool_config["parameters"].items():
                input_schema["properties"][param_name] = {
                    "type": param_config["type"],
                    "description": param_config["description"]
                }
                
                if param_config.get("enum"):
                    input_schema["properties"][param_name]["enum"] = param_config["enum"]
                
                if param_config.get("required", False):
                    input_schema["required"].append(param_name)
            
            tool = types.Tool(
                name=tool_config["name"],
                description=tool_config["description"],
                inputSchema=input_schema
            )
            tools.append(tool)
            
    logger.info(f"Available tools: {[tool.name for tool in tools]}")
    return tools

@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Handle tool calls"""
    logger.info(f"Tool called: {name} with arguments: {arguments}")
    
    # Find tool configuration
    tool_config = None
    for category_data in TOOLS_CONFIG["categories"].values():
        for tool in category_data["tools"]:
            if tool["name"] == name:
                tool_config = tool
                break
        if tool_config:
            break
    
    if not tool_config:
        raise ValueError(f"Unknown tool: {name}")
    
    try:
        # Execute tool based on its type
        if name == "navigate_to_page":
            result = await execute_frontend_navigation(tool_config, arguments)
        elif name == "execute_navigation_to_node":
            result = await execute_device_navigation(tool_config, arguments)
        elif name == "remote_execute_command":
            result = await execute_remote_command(tool_config, arguments)
        else:
            raise ValueError(f"Tool execution not implemented: {name}")
        
        return [types.TextContent(type="text", text=json.dumps(result, indent=2))]
        
    except Exception as e:
        error_msg = f"Error executing tool {name}: {str(e)}"
        logger.error(error_msg)
        return [types.TextContent(type="text", text=json.dumps({"error": error_msg}, indent=2))]

async def execute_frontend_navigation(tool_config: Dict[str, Any], arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute frontend navigation tool"""
    endpoint = tool_config["endpoint"]
    method = tool_config["method"]
    
    url = urljoin(VIRTUALPYTEST_BASE_URL, endpoint)
    
    logger.info(f"Making {method} request to {url} with data: {arguments}")
    
    try:
        if method == "POST":
            response = requests.post(url, json=arguments, timeout=10)
        else:
            response = requests.get(url, params=arguments, timeout=10)
        
        response.raise_for_status()
        result = response.json()
        
        logger.info(f"Frontend navigation result: {result}")
        return result
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {e}")
        raise Exception(f"Failed to call VirtualPyTest API: {e}")

async def execute_device_navigation(tool_config: Dict[str, Any], arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute device navigation using navigation executor"""
    logger.info(f"Executing device navigation with arguments: {arguments}")
    
    try:
        # Import navigation executor directly
        from src.navigation.navigation_executor import execute_navigation_to_node
        
        tree_id = arguments.get("tree_id")
        target_node_id = arguments.get("target_node_id") 
        team_id = arguments.get("team_id")
        current_node_id = arguments.get("current_node_id")
        
        # Execute navigation
        success = execute_navigation_to_node(
            tree_id=tree_id,
            target_node_id=target_node_id,
            team_id=team_id,
            current_node_id=current_node_id
        )
        
        result = {
            "success": success,
            "tree_id": tree_id,
            "target_node_id": target_node_id,
            "message": f"Navigation to {target_node_id} {'completed' if success else 'failed'}"
        }
        
        logger.info(f"Device navigation result: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Device navigation failed: {e}")
        raise Exception(f"Device navigation error: {e}")

async def execute_remote_command(tool_config: Dict[str, Any], arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute remote command tool"""
    endpoint = tool_config["endpoint"]
    method = tool_config["method"]
    
    url = urljoin(VIRTUALPYTEST_BASE_URL, endpoint)
    
    logger.info(f"Making {method} request to {url} with data: {arguments}")
    
    try:
        if method == "POST":
            response = requests.post(url, json=arguments, timeout=30)
        else:
            response = requests.get(url, params=arguments, timeout=30)
        
        response.raise_for_status()
        result = response.json()
        
        logger.info(f"Remote command result: {result}")
        return result
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Remote command request failed: {e}")
        raise Exception(f"Failed to execute remote command: {e}")

async def main():
    """Main entry point"""
    logger.info("Starting VirtualPyTest MCP Server...")
    logger.info(f"VirtualPyTest Base URL: {VIRTUALPYTEST_BASE_URL}")
    logger.info(f"Available tools: {len([tool for category in TOOLS_CONFIG['categories'].values() for tool in category['tools']])}")
    
    # Run the server using stdin/stdout streams
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="virtualpytest",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    import mcp.server.stdio
    asyncio.run(main()) 