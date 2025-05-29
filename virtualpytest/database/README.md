# Device Models Database Integration

This document describes the database schema and integration for device models in the VirtualPyTest application.

## Database Schema

### Table: `device_models`

The `device_models` table stores device model definitions with their associated controllers and specifications.

#### Columns:
- `id` (UUID, Primary Key) - Unique identifier for the device model
- `team_id` (UUID, NOT NULL) - Team that owns this device model
- `name` (VARCHAR(255), NOT NULL) - Human-readable name of the device model
- `types` (JSONB, NOT NULL) - Array of device types (e.g., ["Android Phone", "Android TV"])
- `controllers` (JSONB, NOT NULL) - Object with controller assignments for each type:
  ```json
  {
    "remote": "real_android_tv",
    "av": "hdmi_stream", 
    "network": "",
    "power": "mock"
  }
  ```
- `version` (VARCHAR(100)) - Version information (e.g., "Android 12", "12.0")
- `description` (TEXT) - Additional specifications or notes
- `created_at` (TIMESTAMPTZ) - When the record was created
- `updated_at` (TIMESTAMPTZ) - When the record was last updated
- `created_by` (UUID) - User who created the record
- `updated_by` (UUID) - User who last updated the record

#### Constraints:
- `device_models_name_not_empty` - Ensures name is not empty
- `device_models_types_is_array` - Ensures types field is a JSON array
- `device_models_controllers_is_object` - Ensures controllers field is a JSON object
- `device_models_name_team_unique` - Ensures unique names within each team

#### Indexes:
- `idx_device_models_team_id` - For efficient team-based queries
- `idx_device_models_name` - For name-based searches
- `idx_device_models_created_at` - For chronological sorting
- `idx_device_models_types` - GIN index for JSON array queries
- `idx_device_models_controllers` - GIN index for JSON object queries

## Row Level Security (RLS)

The table uses Row Level Security with the following policy:

```sql
(auth.uid() IS NULL) OR 
(auth.role() = 'service_role'::text) OR 
(team_id IN (
    SELECT team_members.team_id
    FROM team_members
    WHERE (team_members.profile_id = auth.uid())
))
```

This policy allows access to device models if:
1. No authentication (for development/testing)
2. Service role access (for backend operations)
3. User is a member of the team that owns the device model

## API Endpoints

The backend should implement the following REST endpoints:

### GET `/api/virtualpytest/device-models`
- Returns all device models for the authenticated user's team
- Filters by `team_id` based on `X-Team-ID` header or user's team membership

### GET `/api/virtualpytest/device-models/:id`
- Returns a specific device model by ID
- Enforces team-based access control

### POST `/api/virtualpytest/device-models`
- Creates a new device model
- Automatically sets `team_id`, `created_by`, and timestamps

### PUT `/api/virtualpytest/device-models/:id`
- Updates an existing device model
- Automatically updates `updated_by` and `updated_at` via trigger

### DELETE `/api/virtualpytest/device-models/:id`
- Deletes a device model
- Enforces team-based access control

## Frontend Integration

### Service Layer
- `deviceModelService.ts` - Handles API communication with proper error handling
- Uses hardcoded team ID fallback for development: `7fdeb4bb-3639-4ec3-959f-b54769a219ce`

### React Query Integration
- `useDeviceModels.ts` - Custom hook with caching, mutations, and optimistic updates
- Provides loading states, error handling, and automatic cache invalidation

### Component Integration
- Models page automatically loads data from database on mount
- Real-time CRUD operations with proper error handling and user feedback
- Optimistic updates for better user experience

## Setup Instructions

1. **Create the table and policies in Supabase:**
   ```bash
   # Run the SQL script in Supabase SQL Editor
   cat device_models_schema.sql | supabase db sql
   ```

2. **Ensure team_members table exists:**
   The RLS policy depends on a `team_members` table with:
   - `team_id` (UUID)
   - `profile_id` (UUID) - matching `auth.uid()`

3. **Backend API Implementation:**
   Implement the REST endpoints in your Python backend with:
   - Supabase client configuration
   - Team-based filtering using `X-Team-ID` header
   - Proper error handling and response formatting

4. **Environment Configuration:**
   Ensure the frontend can reach the backend at `http://localhost:5009`

## Sample Data

```sql
INSERT INTO device_models (team_id, name, types, controllers, version, description) VALUES
(
    '7fdeb4bb-3639-4ec3-959f-b54769a219ce'::uuid,
    'Samsung Galaxy S21',
    '["Android Phone", "Android Tablet"]'::jsonb,
    '{
        "remote": "real_android_mobile",
        "av": "",
        "network": "",
        "power": "mock"
    }'::jsonb,
    'Android 12',
    'High-end Android device for testing'
);
```

## Error Handling

The system provides comprehensive error handling at multiple levels:

1. **Database Level**: Constraints and RLS policies
2. **Service Level**: API error responses and network error handling  
3. **Frontend Level**: User-friendly error messages and loading states
4. **React Query Level**: Automatic retries and cache management

## Development Notes

- The hardcoded team ID is used for development and should be replaced with proper authentication
- Controller IDs should match the available controllers from `/api/virtualpytest/controller-types`
- The JSONB fields allow for flexible storage while maintaining type safety in TypeScript 