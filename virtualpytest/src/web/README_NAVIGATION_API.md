# Navigation API Documentation

The Navigation API provides endpoints for managing navigation trees, screens, and links for different user interfaces. This system allows you to define UI flow and remote control navigation patterns.

## Overview

The navigation system consists of three main entities:

1. **Navigation Trees**: Top-level containers that define navigation for a specific user interface
2. **Navigation Screens**: Individual screens/pages within a navigation tree
3. **Navigation Links**: Connections between screens that define how users navigate

## Database Schema

### Navigation Trees
- `id`: UUID primary key
- `name`: Tree name (unique per user interface)
- `userinterface_id`: Foreign key to userinterfaces table
- `team_id`: Foreign key to teams table
- `root_screen_id`: Optional reference to the entry screen
- `description`: Optional description
- `created_at`, `updated_at`: Timestamps

### Navigation Screens
- `id`: UUID primary key
- `tree_id`: Foreign key to navigation_trees
- `userinterface_id`: Foreign key to userinterfaces
- `screen_name`: Name of the screen
- `screen_type`: Type ('screen', 'dialog', 'popup', 'overlay')
- `level`: Hierarchical level (0 = root level)
- `parent_screen_id`: Optional parent screen reference
- `is_entry_point`: Boolean indicating if this is an entry point
- `position_x`, `position_y`: Screen position coordinates
- `screenshot_url`: Optional screenshot URL
- `description`: Optional description
- `created_at`, `updated_at`: Timestamps

### Navigation Links
- `id`: UUID primary key
- `tree_id`: Foreign key to navigation_trees
- `userinterface_id`: Foreign key to userinterfaces
- `source_screen_id`: Source screen
- `target_screen_id`: Target screen
- `link_type`: Type ('sibling', 'parent_child')
- `go_key`: Key to navigate forward (e.g., 'RIGHT', 'DOWN', 'OK')
- `comeback_key`: Key to navigate back (e.g., 'LEFT', 'UP', 'BACK')
- `direction`: Optional direction ('up', 'down')
- `description`: Optional description
- `created_at`, `updated_at`: Timestamps

## API Endpoints

### Navigation Trees

#### GET /api/navigation/trees
Get all navigation trees for the current team.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Main Navigation",
    "userinterface_id": "uuid",
    "userinterface": {
      "id": "uuid",
      "name": "Production Interface",
      "models": ["Android Phone", "Smart TV"]
    },
    "team_id": "uuid",
    "root_screen_id": null,
    "description": "Main navigation tree",
    "created_at": "2025-05-28T11:28:17.979027+00:00",
    "updated_at": "2025-05-28T11:28:17.979027+00:00"
  }
]
```

#### POST /api/navigation/trees
Create a new navigation tree.

**Request Body:**
```json
{
  "name": "Main Navigation",
  "userinterface_id": "uuid",
  "description": "Main navigation tree for Production Interface"
}
```

**Response:**
```json
{
  "status": "success",
  "tree": {
    "id": "uuid",
    "name": "Main Navigation",
    "userinterface_id": "uuid",
    "team_id": "uuid",
    "root_screen_id": null,
    "description": "Main navigation tree for Production Interface",
    "created_at": "2025-05-28T11:28:17.979027+00:00",
    "updated_at": "2025-05-28T11:28:17.979027+00:00"
  }
}
```

#### GET /api/navigation/trees/{tree_id}
Get a specific navigation tree.

**Query Parameters:**
- `include_details` (boolean): Include screens and links in response
- `level` (integer): Filter screens by level when include_details=true

**Response (with include_details=true):**
```json
{
  "tree": {
    "id": "uuid",
    "name": "Main Navigation",
    "userinterface_id": "uuid",
    "userinterface": {
      "id": "uuid",
      "name": "Production Interface",
      "models": ["Android Phone", "Smart TV"]
    },
    "team_id": "uuid",
    "root_screen_id": null,
    "description": "Main navigation tree",
    "created_at": "2025-05-28T11:28:17.979027+00:00",
    "updated_at": "2025-05-28T11:28:17.979027+00:00"
  },
  "screens": [
    {
      "id": "uuid",
      "tree_id": "uuid",
      "userinterface_id": "uuid",
      "screen_name": "home",
      "screen_type": "screen",
      "level": 0,
      "parent_screen_id": null,
      "is_entry_point": true,
      "position_x": 100,
      "position_y": 100,
      "screenshot_url": null,
      "description": "Main home screen",
      "created_at": "2025-05-28T11:28:27.089276+00:00",
      "updated_at": "2025-05-28T11:28:27.089282+00:00"
    }
  ],
  "links": [
    {
      "id": "uuid",
      "tree_id": "uuid",
      "userinterface_id": "uuid",
      "source_screen_id": "uuid",
      "target_screen_id": "uuid",
      "link_type": "sibling",
      "go_key": "RIGHT",
      "comeback_key": "LEFT",
      "direction": null,
      "description": "Navigate from home to settings",
      "created_at": "2025-05-28T11:29:04.944335+00:00",
      "updated_at": "2025-05-28T11:29:04.944345+00:00"
    }
  ]
}
```

#### PUT /api/navigation/trees/{tree_id}
Update a navigation tree.

**Request Body:**
```json
{
  "name": "Updated Main Navigation",
  "userinterface_id": "uuid",
  "description": "Updated description"
}
```

#### DELETE /api/navigation/trees/{tree_id}
Delete a navigation tree and all its screens and links.

**Response:**
```json
{
  "status": "success"
}
```

### Navigation Screens

#### GET /api/navigation/trees/{tree_id}/screens
Get all screens for a navigation tree.

**Query Parameters:**
- `level` (integer): Filter screens by level

#### POST /api/navigation/trees/{tree_id}/screens
Create a new navigation screen.

**Request Body:**
```json
{
  "screen_name": "home",
  "screen_type": "screen",
  "level": 0,
  "parent_screen_id": null,
  "is_entry_point": true,
  "position_x": 100,
  "position_y": 100,
  "screenshot_url": null,
  "description": "Main home screen"
}
```

#### PUT /api/navigation/screens/{screen_id}
Update a navigation screen.

#### DELETE /api/navigation/screens/{screen_id}
Delete a navigation screen and all its links.

### Navigation Links

#### GET /api/navigation/trees/{tree_id}/links
Get all links for a navigation tree.

#### POST /api/navigation/trees/{tree_id}/links
Create a new navigation link.

**Request Body:**
```json
{
  "source_screen_id": "uuid",
  "target_screen_id": "uuid",
  "link_type": "sibling",
  "go_key": "RIGHT",
  "comeback_key": "LEFT",
  "direction": "down",
  "description": "Navigate from home to settings"
}
```

**Validation Rules:**
- `link_type` must be either "sibling" or "parent_child"
- At least one of `go_key` or `comeback_key` must be provided
- `direction` must be either "up", "down", or null

#### PUT /api/navigation/links/{link_id}
Update a navigation link.

#### DELETE /api/navigation/links/{link_id}
Delete a navigation link.

### Helper Endpoints

#### GET /api/navigation/userinterfaces
Get all available user interfaces for creating navigation trees.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Production Interface",
    "models": ["Android Phone", "Smart TV"],
    "min_version": "2.0",
    "max_version": "3.0",
    "created_at": "2025-05-28T10:39:03.003167+00:00",
    "updated_at": "2025-05-28T10:39:03.003171+00:00"
  }
]
```

## Error Responses

All endpoints return appropriate HTTP status codes and error messages:

```json
{
  "error": "Error message description"
}
```

Common error codes:
- `400`: Bad Request (validation errors)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

## Usage Examples

### Creating a Complete Navigation Tree

1. **Get available user interfaces:**
```bash
curl -X GET http://localhost:5009/api/navigation/userinterfaces
```

2. **Create a navigation tree:**
```bash
curl -X POST http://localhost:5009/api/navigation/trees \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Navigation",
    "userinterface_id": "fc2f1990-3e27-44ea-842f-d674410c0dc9",
    "description": "Main navigation tree"
  }'
```

3. **Create screens:**
```bash
# Home screen
curl -X POST http://localhost:5009/api/navigation/trees/{tree_id}/screens \
  -H "Content-Type: application/json" \
  -d '{
    "screen_name": "home",
    "screen_type": "screen",
    "level": 0,
    "is_entry_point": true,
    "position_x": 100,
    "position_y": 100,
    "description": "Main home screen"
  }'

# Settings screen
curl -X POST http://localhost:5009/api/navigation/trees/{tree_id}/screens \
  -H "Content-Type: application/json" \
  -d '{
    "screen_name": "settings",
    "screen_type": "screen",
    "level": 0,
    "is_entry_point": false,
    "position_x": 200,
    "position_y": 100,
    "description": "Settings screen"
  }'
```

4. **Create navigation links:**
```bash
curl -X POST http://localhost:5009/api/navigation/trees/{tree_id}/links \
  -H "Content-Type: application/json" \
  -d '{
    "source_screen_id": "{home_screen_id}",
    "target_screen_id": "{settings_screen_id}",
    "link_type": "sibling",
    "go_key": "RIGHT",
    "comeback_key": "LEFT",
    "description": "Navigate from home to settings"
  }'
```

5. **Get complete tree:**
```bash
curl -X GET "http://localhost:5009/api/navigation/trees/{tree_id}?include_details=true"
```

## Testing

Run the comprehensive test script:

```bash
cd /path/to/virtualpytest/src/web
python3 test_navigation_api.py
```

This script will:
- Test all CRUD operations for trees, screens, and links
- Validate error handling
- Clean up test data

## Authentication & Authorization

The API uses team-based access control:
- All operations are scoped to the current team
- Navigation trees belong to teams via `team_id`
- User interfaces must belong to the same team
- Cross-team access is prevented

## Best Practices

1. **Naming Conventions:**
   - Use descriptive names for trees and screens
   - Keep screen names consistent with UI elements

2. **Screen Organization:**
   - Use levels to organize hierarchical navigation
   - Set appropriate entry points
   - Use meaningful position coordinates

3. **Link Design:**
   - Choose appropriate link types (sibling vs parent_child)
   - Use consistent key mappings
   - Provide clear descriptions

4. **Error Handling:**
   - Always check response status codes
   - Handle validation errors gracefully
   - Implement proper cleanup for failed operations 