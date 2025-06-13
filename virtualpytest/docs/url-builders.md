# URL Builder Functions Guide

## Overview

Three clean functions for building URLs in the VirtualPyTest system. These functions are used consistently throughout the entire codebase, including host registration, server communication, and all API calls.

## Functions

### 1. `buildServerUrl(endpoint)`

Build URLs for **server endpoints** using environment configuration.

```python
from src.utils.app_utils import buildServerUrl

# Usage
url = buildServerUrl('/server/verification/status')
# Returns: http://127.0.0.1:5119/server/verification/status
```

**Environment Variables Used:**

- `SERVER_HOST` (default: '127.0.0.1')
- `SERVER_PORT` (default: '5119')
- `SERVER_PROTOCOL` (default: 'http')

**When to use:** Calling server API endpoints from any component, including host registration and ping operations.

### 2. `buildHostUrl(host_info, endpoint)`

Build URLs for **host Flask/API endpoints** (HTTP).

```python
from src.utils.app_utils import buildHostUrl, get_host_by_model

# Usage
host_info = get_host_by_model('pixel_7')
url = buildHostUrl(host_info, '/stream/verification-status')
# Returns: http://192.168.1.100:6119/stream/verification-status
```

**When to use:** Making API calls to host applications.

### 3. `buildHostUrl(host_info, path)`

Build URLs for **host web/nginx resources** (HTTPS).

```python
from src.utils.app_utils import buildHostUrl, get_host_by_model

# Usage
host_info = get_host_by_model('pixel_7')
url = buildHostUrl(host_info, '/screenshots/image.png')
# Returns: https://192.168.1.100:444/screenshots/image.png
```

**When to use:** Accessing static files, images, or web resources from hosts.

## System-Wide Usage

The URL builder functions are used consistently throughout the codebase:

- **Host Registration**: `host_utils.py` uses `buildServerUrl()` for all server communication
- **Route Controllers**: All route files use the appropriate URL builders
- **Navigation System**: `navigation_executor.py` uses `buildServerUrl()` for server calls
- **Verification Routes**: All verification routes use `buildHostUrl()` and `buildHostUrl()`

## Quick Reference

| Function         | Protocol   | Port | Use Case          | Environment Variables                     |
| ---------------- | ---------- | ---- | ----------------- | ----------------------------------------- |
| `buildServerUrl` | HTTP/HTTPS | 5119 | Server API calls  | SERVER_HOST, SERVER_PORT, SERVER_PROTOCOL |
| `buildHostUrl`   | HTTP       | 6119 | Host API calls    | Uses host_info from registry              |
| `buildHostUrl`   | HTTPS      | 444  | Host static files | Uses host_info from registry              |

## Benefits

- **Centralized Configuration**: All URLs respect environment variables
- **Protocol Flexibility**: Easy to switch between HTTP/HTTPS via environment
- **Port Consistency**: No hardcoded ports throughout the codebase
- **Error Prevention**: No manual URL construction that could introduce typos
- **Environment Aware**: Automatically adapts to different deployment environments

## Error Handling

All functions return complete URLs. If host connection data is missing, they automatically build URLs using fallback host information.

```python
# Safe usage - always returns a valid URL
host_info = get_host_by_model('pixel_7')
if host_info:
    url = buildHostUrl(host_info, '/health')
    response = requests.get(url)
```
