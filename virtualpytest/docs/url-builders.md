# URL Builder Functions Guide

## Overview

Three clean functions for building URLs in the VirtualPyTest system.

## Functions

### 1. `buildServerUrl(endpoint)`

Build URLs for **server endpoints**.

```python
from src.utils.app_utils import buildServerUrl

# Usage
url = buildServerUrl('/server/verification/status')
# Returns: http://127.0.0.1:5119/server/verification/status
```

**When to use:** Calling server API endpoints from any component.

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

### 3. `buildHostWebUrl(host_info, path)`

Build URLs for **host web/nginx resources** (HTTPS).

```python
from src.utils.app_utils import buildHostWebUrl, get_host_by_model

# Usage
host_info = get_host_by_model('pixel_7')
url = buildHostWebUrl(host_info, '/screenshots/image.png')
# Returns: https://192.168.1.100:444/screenshots/image.png
```

**When to use:** Accessing static files, images, or web resources from hosts.

## Quick Reference

| Function | Protocol | Port | Use Case |
|----------|----------|------|----------|
| `buildServerUrl` | HTTP | 5119 | Server API calls |
| `buildHostUrl` | HTTP | 6119 | Host API calls |
| `buildHostWebUrl` | HTTPS | 444 | Host static files |

## Error Handling

All functions return complete URLs. If host connection data is missing, they automatically build URLs using fallback host information.

```python
# Safe usage - always returns a valid URL
host_info = get_host_by_model('pixel_7')
if host_info:
    url = buildHostUrl(host_info, '/health')
    response = requests.get(url)
``` 