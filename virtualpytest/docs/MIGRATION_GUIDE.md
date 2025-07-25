# VirtualPyTest Migration Guide

## Overview

This guide provides step-by-step instructions to migrate from the current monolithic structure to the new microservices architecture. Follow these steps in order to ensure a smooth transition.

## Pre-Migration Checklist

- [ ] Backup current codebase: `git checkout -b backup-before-migration`
- [ ] Document current running services and ports
- [ ] Identify all current dependencies
- [ ] Ensure all tests are passing
- [ ] Create new branch: `git checkout -b architecture-migration`

## Migration Steps

### Phase 1: Create New Directory Structure

#### Step 1.1: Create Root Directories

```bash
# Create main service directories
mkdir -p shared/lib/{config,models,utils,exceptions,constants}
mkdir -p backend-core/src/{controllers,services,interfaces}
mkdir -p backend-server/src/{routes,middleware,websockets,serializers}
mkdir -p backend-host/src/{routes,services,agents}
mkdir -p frontend/src/{components,pages,hooks,contexts,services,types,utils,styles}
mkdir -p docker/{nginx,scripts}
mkdir -p docs/{architecture,development,user-guides}
mkdir -p tests/{integration,e2e,load}
mkdir -p scripts/{setup,migration,monitoring}
mkdir -p config/environments
```

#### Step 1.2: Create Configuration Files

```bash
# Create requirements.txt files for each service
touch shared/requirements.txt
touch backend-core/requirements.txt
touch backend-server/requirements.txt
touch backend-host/requirements.txt

# Create Docker files
touch backend-core/Dockerfile
touch backend-server/Dockerfile
touch backend-host/Dockerfile
touch frontend/Dockerfile

# Create setup.py files
touch shared/setup.py
touch backend-core/setup.py

# Create Docker Compose files
touch docker/docker-compose.yml
touch docker/docker-compose.dev.yml
touch docker/docker-compose.prod.yml
```

### Phase 2: Migrate Shared Components

#### Step 2.1: Extract Shared Utilities

```bash
# Move shared utilities
cp -r src/utils/* shared/lib/utils/
cp -r src/models/* shared/lib/models/

# Create shared configuration
cat > shared/lib/config/settings.py << 'EOF'
"""
Shared configuration settings for all VirtualPyTest services
"""
import os
from typing import Dict, Any

class BaseConfig:
    """Base configuration class"""

    # Database settings
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/virtualpytest')

    # Common paths
    BASE_PATH = os.path.dirname(os.path.abspath(__file__))
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

    # Service communication
    BACKEND_SERVER_HOST = os.getenv('BACKEND_SERVER_HOST', 'localhost')
    BACKEND_SERVER_PORT = int(os.getenv('BACKEND_SERVER_PORT', 5009))
    BACKEND_HOST_HOST = os.getenv('BACKEND_HOST_HOST', 'localhost')
    BACKEND_HOST_PORT = int(os.getenv('BACKEND_HOST_PORT', 5010))

    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        """Get configuration as dictionary"""
        return {
            'database_url': cls.DATABASE_URL,
            'log_level': cls.LOG_LEVEL,
            'backend_server': {
                'host': cls.BACKEND_SERVER_HOST,
                'port': cls.BACKEND_SERVER_PORT
            },
            'backend_host': {
                'host': cls.BACKEND_HOST_HOST,
                'port': cls.BACKEND_HOST_PORT
            }
        }

class DevelopmentConfig(BaseConfig):
    """Development configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(BaseConfig):
    """Production configuration"""
    DEBUG = False
    LOG_LEVEL = 'WARNING'

def get_config():
    """Get configuration based on environment"""
    env = os.getenv('FLASK_ENV', 'development')
    if env == 'production':
        return ProductionConfig()
    return DevelopmentConfig()
EOF
```

#### Step 2.2: Create Shared Requirements

```bash
cat > shared/requirements.txt << 'EOF'
# Shared dependencies for all VirtualPyTest services
typing-extensions>=4.0.0
python-dotenv>=1.0.0
pymongo>=4.8.0
networkx>=3.2.1
langdetect>=1.0.9
psutil>=5.8.0
paramiko>=2.9.0
lxml>=4.6.0
regex>=2021.0.0
EOF
```

#### Step 2.3: Create Shared Setup

```bash
cat > shared/setup.py << 'EOF'
from setuptools import setup, find_packages

setup(
    name="virtualpytest-shared",
    version="1.0.0",
    description="Shared libraries for VirtualPyTest",
    packages=find_packages(where="lib"),
    package_dir={"": "lib"},
    python_requires=">=3.8",
    install_requires=[
        "typing-extensions>=4.0.0",
        "python-dotenv>=1.0.0",
        "pymongo>=4.8.0",
        "networkx>=3.2.1",
        "langdetect>=1.0.9",
        "psutil>=5.8.0",
        "paramiko>=2.9.0",
        "lxml>=4.6.0",
        "regex>=2021.0.0",
    ],
)
EOF
```

### Phase 3: Migrate Backend Core

#### Step 3.1: Move Controllers

```bash
# Move controller files
cp -r src/controllers/* backend-core/src/controllers/

# Update imports in controller files
find backend-core/src/controllers -name "*.py" -exec sed -i '' 's/from src\.utils/from shared.lib.utils/g' {} \;
find backend-core/src/controllers -name "*.py" -exec sed -i '' 's/from src\.models/from shared.lib.models/g' {} \;
```

#### Step 3.2: Create Backend Core Requirements

```bash
cat > backend-core/requirements.txt << 'EOF'
# Backend Core Dependencies
-e ../shared

# Device automation
Appium-Python-Client>=3.1.0
selenium>=4.15.0
pyautogui

# AI/ML capabilities
langchain-openai>=0.0.1
openai>=1.0.0

# Controller-specific dependencies
# (Add other controller-specific packages as needed)
EOF
```

#### Step 3.3: Create Backend Core Setup

```bash
cat > backend-core/setup.py << 'EOF'
from setuptools import setup, find_packages

setup(
    name="virtualpytest-backend-core",
    version="1.0.0",
    description="Core backend logic for VirtualPyTest",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.8",
    install_requires=[
        "virtualpytest-shared",
        "Appium-Python-Client>=3.1.0",
        "selenium>=4.15.0",
        "pyautogui",
        "langchain-openai>=0.0.1",
        "openai>=1.0.0",
    ],
)
EOF
```

### Phase 4: Migrate Backend Host

#### Step 4.1: Move Host Routes

```bash
# Create host routes directory
mkdir -p backend-host/src/routes

# Move host-specific routes (like host_rec_routes.py)
cp src/web/routes/host_rec_routes.py backend-host/src/routes/
cp src/web/app_host.py backend-host/src/app.py

# Update imports in host routes
sed -i '' 's/from src\.utils/from shared.lib.utils/g' backend-host/src/routes/*.py
sed -i '' 's/from src\.controllers/from backend_core.src.controllers/g' backend-host/src/routes/*.py
```

#### Step 4.2: Create Host App Structure

```bash
cat > backend-host/src/app.py << 'EOF'
"""
VirtualPyTest Backend Host Application

Handles direct hardware interface and device management.
"""

from flask import Flask, jsonify
from flask_cors import CORS
import logging
import sys
import os

# Add shared lib to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend-core', 'src'))

from shared.lib.config.settings import get_config
from routes.host_rec_routes import host_rec_bp

def create_app():
    """Application factory"""
    app = Flask(__name__)

    # Load configuration
    config = get_config()
    app.config.update(config.get_config())

    # Setup CORS
    CORS(app)

    # Setup logging
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Register blueprints
    app.register_blueprint(host_rec_bp)

    # Health check endpoint
    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy', 'service': 'backend-host'})

    return app

if __name__ == '__main__':
    app = create_app()
    config = get_config()
    app.run(
        host='0.0.0.0',
        port=config.BACKEND_HOST_PORT,
        debug=config.DEBUG
    )
EOF
```

#### Step 4.3: Create Host Requirements

```bash
cat > backend-host/requirements.txt << 'EOF'
# Backend Host Dependencies
-e ../shared
-e ../backend-core

# Flask and web framework
Flask>=2.3.0
Flask-CORS>=4.0.0
flask-socketio>=5.3.0

# Host-specific dependencies
# (Add host-specific packages as needed)
EOF
```

### Phase 5: Migrate Backend Server

#### Step 5.1: Extract API Routes

```bash
# Create server routes
mkdir -p backend-server/src/routes

# Move API routes (non-host routes)
find src/web/routes -name "*.py" -not -name "host_*" -exec cp {} backend-server/src/routes/ \;

# Copy main server app
cp src/web/app_server.py backend-server/src/app.py
```

#### Step 5.2: Create Server App Structure

```bash
cat > backend-server/src/app.py << 'EOF'
"""
VirtualPyTest Backend Server Application

Main API server handling client requests and orchestration.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
import sys
import os
import requests

# Add shared lib to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from shared.lib.config.settings import get_config

def create_app():
    """Application factory"""
    app = Flask(__name__)

    # Load configuration
    config = get_config()
    app.config.update(config.get_config())

    # Setup CORS
    CORS(app)

    # Setup logging
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Register API routes
    # TODO: Import and register your API blueprints here

    # Health check endpoint
    @app.route('/api/health')
    def health():
        return jsonify({'status': 'healthy', 'service': 'backend-server'})

    # Proxy endpoint for host operations
    @app.route('/api/restart/images', methods=['GET', 'POST'])
    def proxy_restart_images():
        """Proxy restart images request to host service"""
        try:
            host_url = f"http://{config.BACKEND_HOST_HOST}:{config.BACKEND_HOST_PORT}"
            response = requests.post(
                f"{host_url}/host/rec/listRestartImages",
                json=request.get_json() if request.is_json else {},
                params=request.args,
                timeout=30
            )
            return response.json(), response.status_code
        except Exception as e:
            return jsonify({'error': f'Host service unavailable: {str(e)}'}), 503

    return app

if __name__ == '__main__':
    app = create_app()
    config = get_config()
    app.run(
        host='0.0.0.0',
        port=config.BACKEND_SERVER_PORT,
        debug=config.DEBUG
    )
EOF
```

#### Step 5.3: Create Server Requirements

```bash
cat > backend-server/requirements.txt << 'EOF'
# Backend Server Dependencies
-e ../shared

# Flask and web framework
Flask>=2.3.0
Flask-CORS>=4.0.0
flask-socketio>=5.3.0

# HTTP client for service communication
requests>=2.31.0

# Database connectivity
psycopg2-binary>=2.9.0

# API serialization
marshmallow>=3.20.0

# Authentication
PyJWT>=2.8.0
bcrypt>=4.0.0
EOF
```

### Phase 6: Migrate Frontend

#### Step 6.1: Move Frontend Files

```bash
# Move React components and assets
cp -r src/web/src/* frontend/src/
cp -r src/web/public/* frontend/public/ 2>/dev/null || true
cp src/web/package.json frontend/
cp src/web/package-lock.json frontend/
cp src/web/vite.config.ts frontend/
cp src/web/tsconfig.json frontend/
cp src/web/index.html frontend/
```

#### Step 6.2: Update Frontend Configuration

```bash
# Update API base URL in frontend
cat > frontend/src/config/api.ts << 'EOF'
// API configuration for VirtualPyTest frontend

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5009/api';

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export default apiConfig;
EOF
```

### Phase 7: Create Docker Configuration

#### Step 7.1: Backend Host Dockerfile

```bash
cat > backend-host/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy shared libraries
COPY shared/ /app/shared/
COPY backend-core/ /app/backend-core/

# Copy host service
COPY backend-host/ /app/backend-host/

# Install Python dependencies
RUN pip install -e /app/shared
RUN pip install -e /app/backend-core
RUN pip install -r /app/backend-host/requirements.txt

# Set working directory to host service
WORKDIR /app/backend-host

# Expose port
EXPOSE 5010

# Run the application
CMD ["python", "src/app.py"]
EOF
```

#### Step 7.2: Backend Server Dockerfile

```bash
cat > backend-server/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy shared libraries
COPY shared/ /app/shared/

# Copy server service
COPY backend-server/ /app/backend-server/

# Install Python dependencies
RUN pip install -e /app/shared
RUN pip install -r /app/backend-server/requirements.txt

# Set working directory to server service
WORKDIR /app/backend-server

# Expose port
EXPOSE 5009

# Run the application
CMD ["python", "src/app.py"]
EOF
```

#### Step 7.3: Frontend Dockerfile

```bash
cat > frontend/Dockerfile << 'EOF'
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
EOF
```

#### Step 7.4: Docker Compose for Development

```bash
cat > docker/docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  shared:
    build:
      context: ../
      dockerfile: shared/Dockerfile
    volumes:
      - shared-lib:/app/shared
    command: tail -f /dev/null

  backend-host:
    build:
      context: ../
      dockerfile: backend-host/Dockerfile
    ports:
      - "5010:5010"
    volumes:
      - ../shared:/app/shared
      - ../backend-core:/app/backend-core
      - ../backend-host:/app/backend-host
    environment:
      - FLASK_ENV=development
      - LOG_LEVEL=DEBUG
    depends_on:
      - shared

  backend-server:
    build:
      context: ../
      dockerfile: backend-server/Dockerfile
    ports:
      - "5009:5009"
    volumes:
      - ../shared:/app/shared
      - ../backend-server:/app/backend-server
    environment:
      - FLASK_ENV=development
      - LOG_LEVEL=DEBUG
      - BACKEND_HOST_HOST=backend-host
      - BACKEND_HOST_PORT=5010
    depends_on:
      - shared
      - backend-host

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_BASE_URL=http://localhost:5009/api
    depends_on:
      - backend-server

volumes:
  shared-lib:
EOF
```

### Phase 8: Testing and Validation

#### Step 8.1: Test Individual Services

```bash
# Test shared libraries
cd shared && python -m pytest tests/ || echo "No tests yet"

# Test backend core
cd backend-core && python -c "from src.controllers import *; print('Core imports working')"

# Test backend host
cd backend-host && python src/app.py &
HOST_PID=$!
curl http://localhost:5010/health
kill $HOST_PID

# Test backend server
cd backend-server && python src/app.py &
SERVER_PID=$!
curl http://localhost:5009/api/health
kill $SERVER_PID

# Test frontend build
cd frontend && npm install && npm run build
```

#### Step 8.2: Test Docker Services

```bash
# Build and test Docker services
cd docker
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to start
sleep 30

# Test health endpoints
curl http://localhost:5010/health  # Host service
curl http://localhost:5009/api/health  # Server service
curl http://localhost:3000  # Frontend

# Test your specific route
curl -X POST http://localhost:5009/api/restart/images \
  -H "Content-Type: application/json" \
  -d '{"device_id": "device1", "timeframe_minutes": 5}'

# Cleanup
docker-compose -f docker-compose.dev.yml down
```

### Phase 9: Migration Validation

#### Step 9.1: Functional Testing

```bash
# Create test script
cat > scripts/migration/test_migration.py << 'EOF'
#!/usr/bin/env python3
"""
Migration validation script
"""

import requests
import json
import time

def test_services():
    """Test all services are working"""

    # Test backend host
    try:
        response = requests.get('http://localhost:5010/health', timeout=5)
        assert response.status_code == 200
        print("✓ Backend Host service healthy")
    except Exception as e:
        print(f"✗ Backend Host service failed: {e}")
        return False

    # Test backend server
    try:
        response = requests.get('http://localhost:5009/api/health', timeout=5)
        assert response.status_code == 200
        print("✓ Backend Server service healthy")
    except Exception as e:
        print(f"✗ Backend Server service failed: {e}")
        return False

    # Test frontend
    try:
        response = requests.get('http://localhost:3000', timeout=5)
        assert response.status_code == 200
        print("✓ Frontend service healthy")
    except Exception as e:
        print(f"✗ Frontend service failed: {e}")
        return False

    # Test specific functionality (your host_rec route)
    try:
        response = requests.post(
            'http://localhost:5009/api/restart/images',
            json={'device_id': 'device1', 'timeframe_minutes': 5},
            timeout=10
        )
        print(f"✓ Restart images endpoint responded: {response.status_code}")
    except Exception as e:
        print(f"✗ Restart images endpoint failed: {e}")
        return False

    return True

if __name__ == '__main__':
    print("Testing migrated services...")
    if test_services():
        print("\n🎉 Migration validation successful!")
    else:
        print("\n❌ Migration validation failed!")
        exit(1)
EOF

chmod +x scripts/migration/test_migration.py
```

#### Step 9.2: Performance Comparison

```bash
# Create performance test
cat > scripts/migration/performance_test.py << 'EOF'
#!/usr/bin/env python3
"""
Performance comparison before/after migration
"""

import requests
import time
import statistics

def measure_endpoint_performance(url, data=None, iterations=10):
    """Measure endpoint response times"""
    times = []

    for _ in range(iterations):
        start = time.time()
        try:
            if data:
                response = requests.post(url, json=data, timeout=30)
            else:
                response = requests.get(url, timeout=30)
            end = time.time()

            if response.status_code == 200:
                times.append(end - start)
        except Exception as e:
            print(f"Request failed: {e}")

    if times:
        return {
            'avg': statistics.mean(times),
            'min': min(times),
            'max': max(times),
            'count': len(times)
        }
    return None

def main():
    """Compare performance"""
    print("Testing performance of migrated services...")

    # Test restart images endpoint
    perf = measure_endpoint_performance(
        'http://localhost:5009/api/restart/images',
        {'device_id': 'device1', 'timeframe_minutes': 5}
    )

    if perf:
        print(f"Restart Images Endpoint:")
        print(f"  Average: {perf['avg']:.3f}s")
        print(f"  Min: {perf['min']:.3f}s")
        print(f"  Max: {perf['max']:.3f}s")
        print(f"  Successful requests: {perf['count']}/10")
    else:
        print("Performance test failed")

if __name__ == '__main__':
    main()
EOF

chmod +x scripts/migration/performance_test.py
```

### Phase 10: Cleanup and Documentation

#### Step 10.1: Remove Old Files

```bash
# Create cleanup script
cat > scripts/migration/cleanup_old_structure.sh << 'EOF'
#!/bin/bash
"""
Cleanup script to remove old monolithic structure
WARNING: Only run this after validating the migration!
"""

echo "⚠️  This will delete the old monolithic structure!"
echo "Make sure you have tested the new architecture thoroughly."
read -p "Are you sure you want to proceed? (y/N): " confirm

if [[ $confirm != [yY] ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo "Backing up old structure..."
mkdir -p backup/old-structure
cp -r src/ backup/old-structure/ 2>/dev/null || true

echo "Removing old files..."
# Comment out these lines until you're ready
# rm -rf src/web/
# rm -rf src/controllers/
# rm -rf src/utils/
# rm -rf src/models/

echo "✓ Cleanup completed. Old files backed up to backup/old-structure/"
EOF

chmod +x scripts/migration/cleanup_old_structure.sh
```

#### Step 10.2: Update Documentation

````bash
# Update main README
cat > README.md << 'EOF'
# VirtualPyTest - Microservices Architecture

A modular test automation framework with microservices architecture.

## Quick Start

### Development Environment

```bash
# Start all services with Docker
cd docker
docker-compose -f docker-compose.dev.yml up

# Or start services individually
cd backend-host && python src/app.py  # Port 5010
cd backend-server && python src/app.py  # Port 5009
cd frontend && npm run dev  # Port 3000
````

### Services

- **Frontend**: http://localhost:3000
- **Backend Server**: http://localhost:5009
- **Backend Host**: http://localhost:5010

## Architecture

See `docs/ARCHITECTURE_REDESIGN.md` for detailed architecture documentation.

## Migration

See `docs/MIGRATION_GUIDE.md` for migration instructions.
EOF

````

## Post-Migration Checklist

- [ ] All services start successfully
- [ ] Health endpoints respond correctly
- [ ] Original functionality (like host_rec_routes) works
- [ ] Frontend can communicate with backend services
- [ ] Docker containers build and run
- [ ] Tests pass (if any)
- [ ] Performance is acceptable
- [ ] Documentation is updated

## Rollback Plan

If migration fails:

```bash
# Switch back to backup
git checkout backup-before-migration

# Or revert specific changes
git revert <migration-commits>
````

## Common Issues and Solutions

### Import Errors

- Update Python path in app.py files
- Check that shared libraries are properly installed
- Verify relative imports are correct

### Service Communication

- Check service URLs and ports
- Verify Docker networking
- Test connectivity between services

### Frontend API Calls

- Update API base URLs
- Check CORS configuration
- Verify proxy settings

### Docker Issues

- Check Dockerfile paths
- Verify volume mounts
- Check environment variables

## Next Steps

1. Set up CI/CD pipelines for each service
2. Add comprehensive testing
3. Configure production deployment
4. Set up monitoring and logging
5. Add service mesh (if needed)

Remember: This migration creates a foundation for better scalability, maintainability, and deployment flexibility.
