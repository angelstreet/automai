# Global Naming Convention - Automai Verification & Action System

## 🎯 **OVERVIEW**

This document establishes the **definitive naming convention** for the Automai verification and action system to ensure consistency across frontend, backend, routes, controllers, and hooks.

**Core Principles:**

- ❌ **NO fallback or legacy compatibility**
- ❌ **NO backward compatibility**
- ✅ **DELETE obsolete code after implementing new patterns**
- ✅ **Consistent naming across all layers**

---

## 📍 **1. ROUTE STRUCTURE**

### **Pattern:**

```
SINGLE (default): /server/{domain}/{operation}
BATCH: /server/{domain}/{operation}_batch
```

### **Examples:**

```bash
# Verification Routes
✅ /server/verification/execute          # Single verification
✅ /server/verification/execute_batch    # Batch verifications

# Action Routes
✅ /server/action/execute                # Single action
✅ /server/action/execute_batch          # Batch actions

# Specific Operations
✅ /server/verification/image/save       # Image reference save
✅ /server/verification/text/save        # Text reference save
✅ /server/verification/image/process    # Image processing (crop + filter + background removal)
```

### **Current Issues to Fix:**

```bash
❌ /server/verification/batch/test       # MISSING - needs to be created
❌ Inconsistent function naming
```

---

## 📍 **2. FUNCTION NAMES**

### **Route Functions:**

```python
# Single operations (default)
def verification_execute():              # /server/verification/execute
def action_execute():                   # /server/action/execute

# Batch operations
def verification_execute_batch():       # /server/verification/execute_batch
def action_execute_batch():            # /server/action/execute_batch

# Specific save operations
def verification_image_save():          # /server/verification/image/save
def verification_text_save():           # /server/verification/text/save
def verification_image_process():       # /server/verification/image/process
```

### **Controller Methods:**

```python
# ImageVerificationController
def verification_image_save()           # Save image references
def verification_image_process()        # Process: crop + filter + background removal
def verification_image_crop()           # Crop image to area

# TextVerificationController
def verification_text_save()            # Save text references
def verification_text_detect()          # Detect text in image area

# All controllers follow same pattern
def verification_{type}_{operation}()
```

---

## 📍 **3. REQUEST STRUCTURE**

### **Corrected Interfaces:**

```typescript
// ✅ CORRECT - No device_id in business logic interfaces
interface VerificationExecutionRequest {
  verifications: VerificationConfig[];
  image_source_url?: string;
  model: string;
  // host and device_id are transport-level, added by frontend
}

interface ActionExecutionRequest {
  actions: ActionConfig[];
  final_wait_time?: number;
  retry_actions?: ActionConfig[];
  // host and device_id are transport-level, added by frontend
}
```

### **Why No device_id in Interfaces:**

**Request Flow:**

1. **Frontend** → Sends `host` object + `device_id` in request body
2. **Server** → Uses `host` to proxy to correct host machine
3. **Host** → Uses `device_id` to select device/controller
4. **Business Logic** → Doesn't need device_id, it's routing data

**Evidence from codebase:**

```typescript
// useVerification.ts - Frontend sends both
body: JSON.stringify({
  host: selectedHost, // Full host object for routing
  device_id: deviceId, // Device selection
  ...batchPayload,
});
```

```python
# routeUtils.py - Server extracts host for routing
def get_host_from_request():
    host_object = data.get('host')  # Used for buildHostUrl()

# host_verification_image_routes.py - Host uses device_id
device_id = data.get('device_id', 'device1')  # Controller selection
```

---

## 📍 **4. SPECIFIC OPERATIONS CLARIFIED**

### **Image Processing (`verification_image_process`):**

**What it does:**

- Crops image to area
- Applies filters (greyscale, binary)
- Removes background (opencv/rembg)
- Returns processed image for verification

**From image.py analysis:**

```python
def process_image(self, data: Dict[str, Any]) -> Dict[str, Any]:
    # 1. Download/load source image
    # 2. Apply background removal if requested
    # 3. Apply image filters (greyscale/binary)
    # 4. Return processed image path
```

### **Save Operations (Specific by Type):**

```python
# Image references
verification_image_save()      # Saves cropped image + metadata to database

# Text references
verification_text_save()       # Saves detected text + area to database

# ADB/Appium references (if needed)
verification_adb_save()        # Saves element selectors
verification_appium_save()     # Saves element selectors
```

---

## 📍 **5. FRONTEND HOOK CENTRALIZATION**

### **Current Problems:**

- Multiple hooks calling verification endpoints
- Inconsistent patterns between `useVerification.ts` and `useNodeOperations.ts`
- Scattered verification logic across components

### **Proposed Centralization:**

```typescript
// Central hooks
useVerification(); // Handles ALL verification operations
useAction(); // Handles ALL action operations

// Reused by specialized hooks:
useNodeOperations(); // Uses useVerification + useAction
Navigation_EdgeSelectionPanel.tsx; // Uses useVerification + useAction
Navigation_EdgeEditDialog.tsx; // Uses useVerification + useAction
```

### **Benefits:**

- Single source of truth for verification/action logic
- Consistent error handling and loading states
- Easier maintenance and debugging
- Reduced code duplication

---

## 📍 **6. CONTROLLER NAMING (Consistent)**

### **All Controllers Follow Same Pattern:**

```python
class ImageVerificationController:      # ✅ Already correct
class TextVerificationController:       # ✅ Already correct
class AdbVerificationController:        # ✅ Already correct
class VideoVerificationController:      # ✅ Already correct
class AppiumVerificationController:     # ✅ Already correct
```

### **Method Naming:**

```python
# Pattern: verification_{type}_{operation}
def verification_image_save()
def verification_image_process()
def verification_image_crop()
def verification_text_save()
def verification_text_detect()
def verification_adb_wait()
def verification_appium_wait()
```

---

## 📍 **7. IMPLEMENTATION PLAN**

### **Phase 1: Missing Routes** ✅ **COMPLETED**

1. ✅ Create `/server/verification/execute_batch` route
2. ✅ Implement `verification_execute_batch()` function
3. ✅ Create `/server/action/execute_batch` route
4. ✅ Implement `action_execute_batch()` function
5. ✅ Update frontend to use new endpoints:
   - `useVerification.ts`: `/server/verification/execute_batch`
   - `useNodeOperations.ts`: `/server/verification/execute_batch`
   - `Navigation_EdgeEditDialog.tsx`: `/server/action/execute_batch`
6. ✅ Fixed TypeScript linter error: `device.available_action_types` → `device.device_action_types`
7. ✅ Added legacy routes for backward compatibility (temporary)

### **Phase 2: Function Renaming** ✅ **COMPLETED**

1. ✅ Renamed all verification route functions to follow `verification_{type}_{operation}` pattern:
   - `execute_image_verification()` → `verification_image_execute()`
   - `execute_text_verification()` → `verification_text_execute()`
   - `execute_adb_verification()` → `verification_adb_execute()`
   - `execute_appium_verification()` → `verification_appium_execute()`
   - `execute_audio_verification()` → `verification_audio_execute()`
   - `execute_video_verification()` → `verification_video_execute()`
2. ✅ Renamed all verification utility functions:
   - `process_image()` → `verification_image_process()`
   - `crop_image()` → `verification_image_crop()`
   - `save_image()` → `verification_image_save()`
   - `detect_text()` → `verification_text_detect()`
   - `save_text()` → `verification_text_save()`
3. ✅ Renamed all verification ADB and reference functions:
   - `wait_for_element_to_appear()` → `verification_adb_wait_for_element_to_appear()`
   - `wait_for_element_to_disappear()` → `verification_adb_wait_for_element_to_disappear()`
   - `get_image_references()` → `verification_image_get_references()`
   - `get_text_references()` → `verification_text_get_references()`
   - `get_all_references()` → `verification_get_all_references()`
   - `get_batch_status()` → `verification_get_batch_status()`
4. ✅ Renamed execution results functions:
   - `record_verification_result()` → `execution_results_record_verification()`
   - `record_action_result()` → `execution_results_record_action()`
5. ✅ Updated all log messages to match new function names
6. ✅ Route registrations remain unchanged (only function names updated)

### **Phase 3: Hook Centralization** ✅ **COMPLETED**

1. ✅ Created centralized `useAction` hook in `virtualpytest/src/web/hooks/actions/useAction.ts`
2. ✅ Updated `Navigation_EdgeEditDialog.tsx` to use centralized `useAction` hook
3. ✅ Updated `Navigation_EdgeSelectionPanel.tsx` to use centralized `useAction` hook
4. ✅ Fixed endpoint inconsistencies (unified on `/server/action/execute_batch`)
5. ✅ Updated `useNodeOperations.ts` to use correct verification endpoint
6. ✅ Eliminated duplicate action execution logic across components
7. ✅ Provided consistent error handling and result formatting

### **Phase 4: Controller Cleanup**

1. ✅ Ensure all controller methods follow naming convention
2. ✅ Remove any obsolete methods
3. ✅ Update route handlers to use correct method names

### **Phase 5: Cleanup**

1. ❌ **DELETE** all obsolete routes and functions
2. ❌ **DELETE** unused hook files
3. ❌ **DELETE** legacy compatibility code
4. ✅ Update documentation

---

## 📍 **8. VALIDATION CHECKLIST**

### **Routes:**

- [ ] `/server/verification/execute_batch` exists and works
- [ ] All route functions follow `{domain}_{operation}_batch` pattern
- [ ] No legacy `/batch/test` routes remain

### **Request Structure:**

- [ ] No `device_id` in business logic interfaces
- [ ] `host` and `device_id` handled at transport level
- [ ] All requests proxy correctly to host machines

### **Controllers:**

- [ ] All methods follow `verification_{type}_{operation}` pattern
- [ ] Image processing clearly named and documented
- [ ] Save operations are type-specific

### **Frontend:**

- [x] Central `useVerification` and `useAction` hooks implemented
- [x] All components use central hooks
- [x] No duplicate verification logic remains

### **Cleanup:**

- [ ] All obsolete code deleted
- [ ] No fallback or legacy compatibility
- [ ] Documentation updated

---

## 📍 **9. EXAMPLES**

### **Complete Request Flow:**

```typescript
// 1. Frontend Hook
const { executeVerifications } = useVerification();

// 2. Frontend Request
await fetch('/server/verification/execute_batch', {
  method: 'POST',
  body: JSON.stringify({
    host: selectedHost,           // Transport: routing to host
    device_id: selectedDeviceId,  // Transport: device selection
    verifications: [...],         // Business: what to verify
    model: deviceModel           // Business: device model
  })
});

// 3. Server Route
def verification_execute_batch():
    # Extract host for routing
    # Proxy to host with full request data

// 4. Host Route
def execute_image_verification():
    device_id = data.get('device_id')  # Device selection
    controller = get_controller(device_id, 'verification_image')

// 5. Controller
def verification_image_save(self, data):
    # Business logic for saving image reference
```

### **Naming Examples:**

```python
# Routes
/server/verification/execute_batch
/server/action/execute_batch
/server/verification/image/save

# Functions
verification_execute_batch()
action_execute_batch()
verification_image_save()

# Controllers
verification_image_process()  # crop + filter + background removal
verification_text_detect()   # OCR text detection
verification_adb_wait()      # wait for ADB element
```

---

## ✅ **READY FOR IMPLEMENTATION**

This naming convention provides:

- **Consistency** across all system layers
- **Clarity** in function purposes
- **Scalability** for future verification types
- **Maintainability** through centralized patterns

**Next Step:** Review and approve for implementation.
