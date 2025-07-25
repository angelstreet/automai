# VirtualPyTest Architecture Redesign

## Overview

This document outlines the new microservices-based architecture for VirtualPyTest, designed to separate concerns, enable Docker containerization, and improve maintainability.

## Current Problems

- Mixed responsibilities in single codebase
- Web components and device controllers intermingled
- Difficult to scale individual components
- Complex dependencies between UI and hardware layers
- Hard to deploy and maintain

## New Architecture

### Component Separation

```
virtualpytest/
├── shared/                    # Shared libraries and utilities
├── backend-core/              # Core Python logic (device controllers)
├── backend-server/            # Flask API server (business logic)
├── backend-host/              # Flask host controller (hardware interface)
├── frontend/                  # React UI application
└── docker/                    # Container orchestration
```

## Component Responsibilities

### 1. Shared (`shared/`)

**Purpose**: Common libraries used across all backend services

**Contents**:

- Configuration management
- Data models and schemas
- Utility functions
- Custom exceptions
- System constants

**Key Files**:

```
shared/lib/
├── config/settings.py         # Shared configuration
├── models/test_models.py      # Test case data models
├── utils/db_utils.py          # Database utilities
└── exceptions/custom_exceptions.py
```

**Dependencies**: None (base package)

---

### 2. Backend Core (`backend-core/`)

**Purpose**: Pure Python business logic and device controllers

**Contents**:

- Device controllers (desktop, mobile, A/V, network)
- Test execution services
- Automation logic
- Controller management

**Key Files**:

```
backend-core/src/
├── controllers/               # Device control logic
│   ├── base_controller.py
│   ├── controller_manager.py
│   ├── desktop/               # Desktop automation
│   ├── mobile/                # Mobile device control
│   └── audiovideo/            # A/V controllers
├── services/                  # Business services
│   ├── test_execution_service.py
│   └── automation_service.py
└── interfaces/                # Abstract interfaces
```

**Dependencies**: `shared`

---

### 3. Backend Server (`backend-server/`)

**Purpose**: Main API server handling client requests and orchestration

**Contents**:

- REST API endpoints
- WebSocket handling
- Authentication/authorization
- Request orchestration
- Client-facing business logic

**Route Categories**:

```
/api/testcases          # Test case management
/api/campaigns          # Test campaign operations
/api/execution          # Test execution control
/api/users              # User management
/api/teams              # Team/tenant management
/api/hosts              # Host coordination
```

**Key Files**:

```
backend-server/src/
├── routes/
│   ├── test_routes.py         # Test management endpoints
│   ├── campaign_routes.py     # Campaign operations
│   ├── execution_routes.py    # Test execution
│   └── proxy_routes.py        # Proxy to host services
├── middleware/                # Flask middleware
├── websockets/                # Real-time communication
└── serializers/               # API data serialization
```

**Dependencies**: `shared`, calls `backend-host` via HTTP

---

### 4. Backend Host (`backend-host/`)

**Purpose**: Direct hardware interface and device management

**Contents**:

- Device-specific routes
- Hardware abstraction
- System monitoring
- Device discovery
- Direct file system access

**Route Categories**:

```
/host/rec               # Recording/capture operations (your current routes)
/host/device            # Direct device control
/host/hardware          # Hardware management
/host/health            # System health monitoring
/host/discovery         # Device detection
```

**Key Files**:

```
backend-host/src/
├── routes/
│   ├── host_rec_routes.py     # Image capture (your current file)
│   ├── device_control_routes.py
│   ├── hardware_routes.py
│   └── system_health_routes.py
├── services/
│   ├── host_manager.py        # Host system management
│   └── device_discovery.py    # Device enumeration
└── agents/                    # Device-specific agents
```

**Dependencies**: `shared`, `backend-core`

---

### 5. Frontend (`frontend/`)

**Purpose**: React-based user interface

**Contents**:

- React components
- UI state management
- API service layer
- User experience

**Key Files**:

```
frontend/src/
├── components/                # React components
│   ├── dashboard/
│   ├── test-management/
│   └── device-control/
├── services/
│   ├── api.ts                 # Main API client
│   ├── testService.ts         # Test management API
│   └── deviceService.ts       # Device control API
└── pages/                     # Page components
```

**Dependencies**: Calls `backend-server` via HTTP/WebSocket

## Route Distribution

### Current Route: `host_rec_routes.py`

**Current Location**: `src/web/routes/host_rec_routes.py`
**New Location**: `backend-host/src/routes/host_rec_routes.py`

**Rationale**:

- Direct file system access (`capture_folder`)
- Device controller interaction (`get_controller`)
- Host-specific operations
- Hardware-level functionality

### Route Categories by Service

#### Backend Server Routes (Client-facing)

```python
# User and system management
/api/users              # User management
/api/teams              # Team operations
/api/auth               # Authentication

# Test management
/api/testcases          # Test case CRUD
/api/campaigns          # Campaign management
/api/execution          # Test execution orchestration

# System coordination
/api/hosts              # Host management
/api/monitoring         # System-wide monitoring
```

#### Backend Host Routes (Hardware-facing)

```python
# Device operations
/host/devices           # Device enumeration and control
/host/rec               # Recording and capture (your routes)
/host/hardware          # Hardware management

# System operations
/host/health            # Host system health
/host/discovery         # Device discovery
/host/files             # File system operations
```

## Communication Flow

### Request Flow Example: List Restart Images

```
1. Frontend → GET /api/restart/images?device_id=device1
2. backend-server receives request
3. backend-server validates and proxies to backend-host
4. backend-server → POST /host/rec/listRestartImages
5. backend-host processes device-specific logic
6. backend-host returns image data
7. backend-server formats response for frontend
8. backend-server → Response to frontend
```

### Data Flow

```
Frontend ←→ backend-server ←→ backend-host ←→ Hardware/Devices
   ↑              ↑              ↑
   UI         Business        Hardware
 Logic         Logic          Interface
```

## Benefits

### 1. Separation of Concerns

- **UI Logic**: Isolated in frontend
- **Business Logic**: Centralized in backend-server
- **Hardware Logic**: Isolated in backend-host
- **Shared Logic**: Reusable in shared libraries

### 2. Scalability

- Scale UI and API independently
- Multiple host controllers for different hardware
- Load balance API servers
- Independent deployment cycles

### 3. Development

- Teams can work on different services
- Clear interfaces and contracts
- Independent testing and debugging
- Technology flexibility per service

### 4. Deployment

- Docker containerization per service
- Independent versioning
- Rollback capabilities per component
- Environment-specific configurations

## Docker Strategy

### Service Containers

```yaml
# Individual service containers
backend-server: # API and business logic
backend-host: # Hardware interface
frontend: # UI application
shared: # Shared libraries volume
```

### Development Environment

```bash
# Start all services
docker-compose -f docker/docker-compose.dev.yml up

# Start individual services
docker-compose up backend-server
docker-compose up backend-host
docker-compose up frontend
```

### Production Environment

```bash
# Production deployment
docker-compose -f docker/docker-compose.prod.yml up -d

# With load balancing and scaling
docker-compose up --scale backend-server=3
```

## Migration Benefits

1. **Maintainability**: Clear component boundaries
2. **Testability**: Isolated testing per service
3. **Deployability**: Independent deployments
4. **Scalability**: Component-level scaling
5. **Development**: Parallel team development
6. **Technology**: Service-specific tech choices

## Next Steps

See `MIGRATION_GUIDE.md` for detailed step-by-step migration instructions.
