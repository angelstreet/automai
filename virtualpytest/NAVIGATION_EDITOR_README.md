# Navigation Editor

The Navigation Editor is a visual tool for creating and editing user interface navigation trees. It allows you to map out the navigation flow of your application by creating nodes (screens) and edges (navigation paths) with specific key mappings.

## Features

### Visual Node-Based Editor
- **Drag & Drop Interface**: Built with React Flow for intuitive node manipulation
- **Custom Screen Nodes**: Each node represents a screen/dialog in your application
- **Thumbnail Support**: Ready for screenshot thumbnails (placeholder for now)
- **Node Types**: Screen, Dialog, Popup, Overlay

### Navigation Mapping
- **Bidirectional Edges**: Each connection can have both "go" and "comeback" navigation keys
- **Key Mapping**: Define specific keys (RIGHT, LEFT, ENTER, BACK, etc.) for navigation
- **Visual Labels**: Navigation keys are displayed directly on the edges
- **Validation**: Ensures at least one navigation direction is specified

### Editor Controls
- **Add Screens**: Click "Add Screen" to create new nodes
- **Connect Nodes**: Drag from one node to another to create navigation paths
- **Edit Properties**: Click nodes/edges to edit their properties
- **Delete Elements**: Select and delete unwanted nodes or connections
- **Zoom & Pan**: Full viewport controls with minimap

## How to Use

### 1. Access the Editor
- Go to Configuration > Interface in the main application
- Click "Edit Navigation" for any UI tree
- The editor opens in a new tab

### 2. Create Your Navigation Flow
1. **Add Screens**: Use the "Add Screen" button to create nodes
2. **Position Nodes**: Drag nodes to arrange them logically
3. **Connect Screens**: Drag from one node to another to create navigation paths
4. **Set Navigation Keys**: Click on edges to define go/comeback keys
5. **Configure Nodes**: Click on nodes to set names, types, and descriptions

### 3. Navigation Key Examples
- **Directional**: RIGHT, LEFT, UP, DOWN
- **Action Keys**: ENTER, OK, SELECT
- **System Keys**: BACK, ESC, MENU, HOME
- **Custom Keys**: Any key specific to your device/platform

### 4. Node Types
- **Screen**: Full application screens
- **Dialog**: Modal dialogs or overlays
- **Popup**: Small popup windows
- **Overlay**: UI overlays or notifications

## Sample Navigation Tree

The editor comes with a sample navigation tree showing:
- **Home Screen** (START) → **Main Menu** (RIGHT/LEFT)
- **Main Menu** → **Settings** (ENTER/BACK)

This demonstrates the basic pattern of bidirectional navigation with specific key mappings.

## Technical Implementation

### Built With
- **React Flow**: Professional node-based editor
- **Material-UI**: Consistent UI components
- **TypeScript**: Type-safe development

### Data Structure
```typescript
interface UINavigationNode {
  id: string;
  data: {
    label: string;
    type: 'screen' | 'dialog' | 'popup' | 'overlay';
    description?: string;
    isStartNode?: boolean;
    screenshot?: string;  // Future: thumbnail support
  };
}

interface UINavigationEdge {
  data: {
    go?: string;        // Navigation key to go from source to target
    comeback?: string;  // Navigation key to return from target to source
    description?: string;
  };
}
```

## Future Enhancements

### Planned Features
1. **Screenshot Integration**: Upload and display screen thumbnails
2. **Fullscreen Image Viewer**: Click thumbnails to view full-size screenshots
3. **Auto-Layout**: Automatic node arrangement algorithms
4. **Export/Import**: Save and load navigation trees
5. **Validation Tools**: Check for unreachable nodes or missing paths
6. **Grouping**: Collapse/expand node groups for large navigation trees

### Database Integration
- Save navigation trees to Supabase
- Version control for navigation changes
- Team collaboration features

## Usage Tips

1. **Start with Key Screens**: Begin by mapping your main application screens
2. **Use Logical Positioning**: Arrange nodes to match the visual flow of your app
3. **Be Consistent**: Use consistent key naming (e.g., always "BACK" not "ESC")
4. **Document Complex Paths**: Use descriptions for non-obvious navigation flows
5. **Test Bidirectional**: Ensure users can navigate both ways when appropriate

## Keyboard Shortcuts

- **Delete**: Remove selected node or edge
- **Escape**: Deselect all elements
- **Space + Drag**: Pan the viewport
- **Mouse Wheel**: Zoom in/out

The Navigation Editor provides a powerful visual way to map and understand your application's navigation flow, making it easier to design consistent user experiences and automate navigation testing. 