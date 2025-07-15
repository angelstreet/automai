# Blueprint Naming Consistency Refactor Plan

## Executive Summary

This document outlines a comprehensive plan to achieve full consistency in Flask blueprint naming across the VirtualPyTest web application. The refactor will standardize all blueprint variable names, constructor names, and registration patterns to follow a predictable convention.

## Current State Analysis

### Naming Convention Goals

- **Server routes**: `server_{service}_bp` variable, `Blueprint('server_{service}', ...)`
- **Host routes**: `host_{service}_bp` variable, `Blueprint('host_{service}', ...)`
- **Common routes**: `{service}_bp` variable, `Blueprint('{service}', ...)`

### Current Inconsistencies

#### 1. Host Route Variable Names (5 files)

```
❌ Current                        ✅ Target
verification_host_bp           → host_verification_bp
verification_text_host_bp      → host_verification_text_bp
verification_adb_host_bp       → host_verification_adb_bp
verification_image_host_bp     → host_verification_image_bp
aiagent_host_bp               → host_aiagent_bp
```

#### 2. Server Route Blueprint Constructor Names (11 files)

```
❌ Current                        ✅ Target
Blueprint('power', ...)        → Blueprint('server_power', ...)
Blueprint('validation', ...)   → Blueprint('server_validation', ...)
Blueprint('navigation', ...)   → Blueprint('server_navigation', ...)
Blueprint('pathfinding', ...)  → Blueprint('server_pathfinding', ...)
Blueprint('testcase', ...)     → Blueprint('server_testcase', ...)
Blueprint('campaign', ...)     → Blueprint('server_campaign', ...)
Blueprint('system', ...)       → Blueprint('server_system', ...)
Blueprint('frontend', ...)     → Blueprint('server_frontend', ...)
Blueprint('execution_results', ...) → Blueprint('server_execution_results', ...)
Blueprint('navigation_execution', ...) → Blueprint('server_navigation_execution', ...)
```

#### 3. Special Cases

```
❌ Current                        ✅ Target
server_stream_proxy_routes     → server_stream_proxy_bp (variable name)
```

## Refactor Plan

### Phase 1: Pre-Refactor Preparation

**Duration**: 30 minutes  
**Risk Level**: Low

#### 1.1 Create Backup

```bash
# Create backup of current routes
cp -r virtualpytest/src/web/routes virtualpytest/src/web/routes.backup
```

#### 1.2 Run Full Test Suite

```bash
# Ensure all tests pass before refactoring
cd virtualpytest
python -m pytest tests/ -v
```

#### 1.3 Document Current Endpoints

```bash
# Extract all current endpoints for validation
grep -r "@.*\.route" src/web/routes/ > current_endpoints.txt
```

### Phase 2: Host Route Variable Name Refactor

**Duration**: 45 minutes  
**Risk Level**: Medium

#### 2.1 Update Host Verification Routes (4 files)

**File**: `host_verification_routes.py`

```python
# Change variable name
verification_host_bp → host_verification_bp

# Update Blueprint constructor
Blueprint('verification_host', ...) → Blueprint('host_verification', ...)

# Update all route decorators
@verification_host_bp.route(...) → @host_verification_bp.route(...)
```

**File**: `host_verification_text_routes.py`

```python
# Change variable name
verification_text_host_bp → host_verification_text_bp

# Update Blueprint constructor
Blueprint('verification_text_host', ...) → Blueprint('host_verification_text', ...)

# Update all route decorators
@verification_text_host_bp.route(...) → @host_verification_text_bp.route(...)
```

**File**: `host_verification_adb_routes.py`

```python
# Change variable name
verification_adb_host_bp → host_verification_adb_bp

# Update Blueprint constructor
Blueprint('verification_adb_host', ...) → Blueprint('host_verification_adb', ...)

# Update all route decorators
@verification_adb_host_bp.route(...) → @host_verification_adb_bp.route(...)
```

**File**: `host_verification_image_routes.py`

```python
# Change variable name
verification_image_host_bp → host_verification_image_bp

# Update Blueprint constructor
Blueprint('verification_image_host', ...) → Blueprint('host_verification_image', ...)

# Update all route decorators
@verification_image_host_bp.route(...) → @host_verification_image_bp.route(...)
```

#### 2.2 Update Host AI Agent Routes

**File**: `host_aiagent_routes.py`

```python
# Change variable name
aiagent_host_bp → host_aiagent_bp

# Update Blueprint constructor
Blueprint('host_aiagent', ...) → Blueprint('host_aiagent', ...) # Already correct

# Update all route decorators
@aiagent_host_bp.route(...) → @host_aiagent_bp.route(...)
```

#### 2.3 Update Registration in **init**.py

```python
# Update host route registrations
('host_verification_routes', 'verification_host_bp') → ('host_verification_routes', 'host_verification_bp')
('host_verification_text_routes', 'verification_text_host_bp') → ('host_verification_text_routes', 'host_verification_text_bp')
('host_verification_adb_routes', 'verification_adb_host_bp') → ('host_verification_adb_routes', 'host_verification_adb_bp')
('host_verification_image_routes', 'verification_image_host_bp') → ('host_verification_image_routes', 'host_verification_image_bp')
('host_aiagent_routes', 'aiagent_host_bp') → ('host_aiagent_routes', 'host_aiagent_bp')
```

### Phase 3: Server Route Blueprint Constructor Refactor

**Duration**: 60 minutes  
**Risk Level**: Low-Medium

#### 3.1 Update Server Route Constructors (11 files)

**Files to update**:

1. `server_power_routes.py`: `Blueprint('power', ...)` → `Blueprint('server_power', ...)`
2. `server_validation_routes.py`: `Blueprint('validation', ...)` → `Blueprint('server_validation', ...)`
3. `server_navigation_routes.py`: `Blueprint('navigation', ...)` → `Blueprint('server_navigation', ...)`
4. `server_pathfinding_routes.py`: `Blueprint('pathfinding', ...)` → `Blueprint('server_pathfinding', ...)`
5. `server_testcase_routes.py`: `Blueprint('testcase', ...)` → `Blueprint('server_testcase', ...)`
6. `server_campaign_routes.py`: `Blueprint('campaign', ...)` → `Blueprint('server_campaign', ...)`
7. `server_system_routes.py`: `Blueprint('system', ...)` → `Blueprint('server_system', ...)`
8. `server_frontend_routes.py`: `Blueprint('frontend', ...)` → `Blueprint('server_frontend', ...)`
9. `server_execution_results_routes.py`: `Blueprint('execution_results', ...)` → `Blueprint('server_execution_results', ...)`
10. `server_navigation_execution_routes.py`: `Blueprint('navigation_execution', ...)` → `Blueprint('server_navigation_execution', ...)`

#### 3.2 Fix Special Cases

**File**: `server_stream_proxy_routes.py`

```python
# Fix variable name
server_stream_proxy_routes → server_stream_proxy_bp

# Update Blueprint constructor (already correct)
Blueprint('server_stream_proxy', ...)

# Update all route decorators
@server_stream_proxy_routes.route(...) → @server_stream_proxy_bp.route(...)
```

**Update registration in **init**.py**:

```python
('server_stream_proxy_routes', 'server_stream_proxy_routes') → ('server_stream_proxy_routes', 'server_stream_proxy_bp')
```

### Phase 4: Validation and Testing

**Duration**: 30 minutes  
**Risk Level**: Low

#### 4.1 Automated Validation

```bash
# Verify all blueprints follow naming convention
python scripts/validate_blueprint_naming.py

# Check for any remaining inconsistencies
grep -r "Blueprint(" src/web/routes/ | grep -v "server_\|host_\|core"
```

#### 4.2 Build and Import Testing

```bash
# Test server mode
python -c "from src.web.routes import register_routes; from flask import Flask; app = Flask(__name__); register_routes(app, 'server')"

# Test host mode
python -c "from src.web.routes import register_routes; from flask import Flask; app = Flask(__name__); register_routes(app, 'host')"
```

#### 4.3 Endpoint Validation

```bash
# Ensure all endpoints still exist
grep -r "@.*\.route" src/web/routes/ > new_endpoints.txt
diff current_endpoints.txt new_endpoints.txt
```

#### 4.4 Full Test Suite

```bash
# Run complete test suite
python -m pytest tests/ -v
```

### Phase 5: Documentation and Cleanup

**Duration**: 15 minutes  
**Risk Level**: Low

#### 5.1 Update Documentation

- Update any documentation that references old blueprint names
- Update code comments that mention blueprint naming patterns

#### 5.2 Cleanup

```bash
# Remove backup if everything works
rm -rf virtualpytest/src/web/routes.backup
rm current_endpoints.txt new_endpoints.txt
```

## Implementation Script

### Automated Refactor Script

```bash
#!/bin/bash
# blueprint_consistency_refactor.sh

set -e

echo "🔄 Starting Blueprint Consistency Refactor..."

# Phase 1: Backup
echo "📁 Creating backup..."
cp -r virtualpytest/src/web/routes virtualpytest/src/web/routes.backup

# Phase 2: Host route variable names
echo "🏠 Updating host route variable names..."

# Update verification routes
sed -i 's/verification_host_bp/host_verification_bp/g' virtualpytest/src/web/routes/host_verification_routes.py
sed -i "s/Blueprint('verification_host'/Blueprint('host_verification'/g" virtualpytest/src/web/routes/host_verification_routes.py

# Update verification text routes
sed -i 's/verification_text_host_bp/host_verification_text_bp/g' virtualpytest/src/web/routes/host_verification_text_routes.py
sed -i "s/Blueprint('verification_text_host'/Blueprint('host_verification_text'/g" virtualpytest/src/web/routes/host_verification_text_routes.py

# Update verification adb routes
sed -i 's/verification_adb_host_bp/host_verification_adb_bp/g' virtualpytest/src/web/routes/host_verification_adb_routes.py
sed -i "s/Blueprint('verification_adb_host'/Blueprint('host_verification_adb'/g" virtualpytest/src/web/routes/host_verification_adb_routes.py

# Update verification image routes
sed -i 's/verification_image_host_bp/host_verification_image_bp/g' virtualpytest/src/web/routes/host_verification_image_routes.py
sed -i "s/Blueprint('verification_image_host'/Blueprint('host_verification_image'/g" virtualpytest/src/web/routes/host_verification_image_routes.py

# Update aiagent routes
sed -i 's/aiagent_host_bp/host_aiagent_bp/g' virtualpytest/src/web/routes/host_aiagent_routes.py

# Phase 3: Server route constructor names
echo "🖥️  Updating server route constructor names..."

# Update all server blueprint constructors
sed -i "s/Blueprint('power'/Blueprint('server_power'/g" virtualpytest/src/web/routes/server_power_routes.py
sed -i "s/Blueprint('validation'/Blueprint('server_validation'/g" virtualpytest/src/web/routes/server_validation_routes.py
sed -i "s/Blueprint('navigation'/Blueprint('server_navigation'/g" virtualpytest/src/web/routes/server_navigation_routes.py
sed -i "s/Blueprint('pathfinding'/Blueprint('server_pathfinding'/g" virtualpytest/src/web/routes/server_pathfinding_routes.py
sed -i "s/Blueprint('testcase'/Blueprint('server_testcase'/g" virtualpytest/src/web/routes/server_testcase_routes.py
sed -i "s/Blueprint('campaign'/Blueprint('server_campaign'/g" virtualpytest/src/web/routes/server_campaign_routes.py
sed -i "s/Blueprint('system'/Blueprint('server_system'/g" virtualpytest/src/web/routes/server_system_routes.py
sed -i "s/Blueprint('frontend'/Blueprint('server_frontend'/g" virtualpytest/src/web/routes/server_frontend_routes.py
sed -i "s/Blueprint('execution_results'/Blueprint('server_execution_results'/g" virtualpytest/src/web/routes/server_execution_results_routes.py
sed -i "s/Blueprint('navigation_execution'/Blueprint('server_navigation_execution'/g" virtualpytest/src/web/routes/server_navigation_execution_routes.py

# Fix special case
sed -i 's/server_stream_proxy_routes/server_stream_proxy_bp/g' virtualpytest/src/web/routes/server_stream_proxy_routes.py

# Phase 4: Update registrations
echo "📝 Updating __init__.py registrations..."

# Update host registrations
sed -i "s/'verification_host_bp'/'host_verification_bp'/g" virtualpytest/src/web/routes/__init__.py
sed -i "s/'verification_text_host_bp'/'host_verification_text_bp'/g" virtualpytest/src/web/routes/__init__.py
sed -i "s/'verification_adb_host_bp'/'host_verification_adb_bp'/g" virtualpytest/src/web/routes/__init__.py
sed -i "s/'verification_image_host_bp'/'host_verification_image_bp'/g" virtualpytest/src/web/routes/__init__.py
sed -i "s/'aiagent_host_bp'/'host_aiagent_bp'/g" virtualpytest/src/web/routes/__init__.py

# Update server registrations
sed -i "s/'server_stream_proxy_routes'/'server_stream_proxy_bp'/g" virtualpytest/src/web/routes/__init__.py

echo "✅ Blueprint consistency refactor completed!"
echo "🧪 Please run tests to validate the changes"
```

## Risk Assessment

### High Risk Areas

1. **Route decorators**: If any route decorators reference the old blueprint variable names
2. **Error handling**: Code that might check blueprint names for logging/debugging
3. **External dependencies**: Any external code that might reference blueprint names

### Medium Risk Areas

1. **Import statements**: Ensure all imports use correct variable names
2. **Registration order**: Verify blueprint registration order doesn't affect functionality

### Low Risk Areas

1. **Blueprint constructor names**: These are internal Flask identifiers
2. **URL prefixes**: These remain unchanged
3. **Route paths**: These remain unchanged

## Rollback Plan

If issues arise during refactor:

1. **Immediate rollback**:

   ```bash
   rm -rf virtualpytest/src/web/routes
   mv virtualpytest/src/web/routes.backup virtualpytest/src/web/routes
   ```

2. **Partial rollback**: Revert specific files from backup
3. **Incremental fix**: Fix issues one by one while keeping most changes

## Success Criteria

✅ **All blueprints follow consistent naming**:

- Server: `server_{service}_bp` with `Blueprint('server_{service}', ...)`
- Host: `host_{service}_bp` with `Blueprint('host_{service}', ...)`

✅ **No functional changes**:

- All endpoints remain accessible
- All API responses unchanged
- All tests pass

✅ **Clean codebase**:

- No naming inconsistencies
- Predictable patterns for future development
- Easier maintenance and debugging

## Timeline

**Total Estimated Time**: 3 hours

- Phase 1 (Preparation): 30 minutes
- Phase 2 (Host routes): 45 minutes
- Phase 3 (Server routes): 60 minutes
- Phase 4 (Validation): 30 minutes
- Phase 5 (Cleanup): 15 minutes

## Post-Refactor Benefits

1. **Improved Maintainability**: Consistent naming makes code easier to understand
2. **Reduced Errors**: Predictable patterns reduce naming mistakes
3. **Better Developer Experience**: New developers can quickly understand the structure
4. **Easier Debugging**: Consistent naming helps with logging and error tracking
5. **Future-Proof**: Establishes clear conventions for new route additions
