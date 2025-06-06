# VirtualPyTest Web Interface

A modern React TypeScript web interface for the VirtualPyTest framework, providing comprehensive management of test cases, campaigns, and navigation trees.

## Features

### 🎯 Dashboard
- Overview of system statistics
- Quick actions for common tasks
- Recent activity monitoring
- System status indicators

### 🧪 Test Case Management
- Create, edit, and delete test cases
- Support for multiple test types (functional, performance, endurance, robustness)
- Step-by-step test definition with verification conditions
- Visual test case overview with filtering

### 📋 Campaign Management
- Create and manage test campaigns
- Associate test cases with campaigns
- Configure remote controllers and A/V acquisition
- Enable test prioritization
- Multi-select test case assignment

### 🌳 Navigation Tree Editor
- Visual tree structure management
- Node and action definition
- Device and version tracking
- Hierarchical navigation flow design

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Material-UI (MUI) v5
- **Build Tool**: Vite
- **Backend**: Flask (Python)
- **Database**: MongoDB
- **Styling**: CSS3 with Material-UI theming

## Prerequisites

- Node.js 16+ and npm
- Python 3.8+
- MongoDB (optional - graceful fallback if unavailable)

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Start the Flask backend** (in a separate terminal):
   ```bash
   cd automai/virtualpytest/src/web
   python app.py
   ```

The web interface will be available at `http://localhost:5073` and the API at `http://localhost:5009`.

## Project Structure

```
src/web/
├── src/
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles
│   └── pages/
│       ├── Dashboard.tsx    # Dashboard overview
│       ├── TestCaseEditor.tsx # Test case management
│       ├── CampaignEditor.tsx # Campaign management
│       └── TreeEditor.tsx   # Navigation tree editor
├── pages/
│   └── TestCaseEditor.tsx   # Legacy test case editor
├── app.py                   # Flask backend server
├── type.ts                  # TypeScript type definitions
├── package.json             # Node.js dependencies
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
└── index.html               # HTML entry point
```

## API Endpoints

The Flask backend provides the following REST API endpoints:

### Test Cases
- `GET /api/testcases` - List all test cases
- `POST /api/testcases` - Create a new test case
- `GET /api/testcases/{id}` - Get a specific test case
- `PUT /api/testcases/{id}` - Update a test case
- `DELETE /api/testcases/{id}` - Delete a test case

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create a new campaign
- `GET /api/campaigns/{id}` - Get a specific campaign
- `PUT /api/campaigns/{id}` - Update a campaign
- `DELETE /api/campaigns/{id}` - Delete a campaign

### Navigation Trees
- `GET /api/trees` - List all navigation trees
- `POST /api/trees` - Create a new navigation tree
- `GET /api/trees/{id}` - Get a specific tree
- `PUT /api/trees/{id}` - Update a tree
- `DELETE /api/trees/{id}` - Delete a tree

### System
- `GET /api/health` - Health check and MongoDB status

## Data Models

### TestCase
```typescript
interface TestCase {
  test_id: string;
  name: string;
  test_type: 'functional' | 'performance' | 'endurance' | 'robustness';
  start_node: string;
  steps: Array<{
    target_node: string;
    verify: {
      type: 'single' | 'compound';
      conditions: Array<{
        type: string;
        condition: string;
        timeout: number;
      }>;
    };
  }>;
}
```

### Campaign
```typescript
interface Campaign {
  campaign_id: string;
  campaign_name: string;
  navigation_tree_id: string;
  remote_controller: string;
  audio_video_acquisition: string;
  test_case_ids: string[];
  auto_tests: {
    mode: 'manual' | 'auto';
    nodes: string[];
  };
  prioritize: boolean;
}
```

### Tree
```typescript
interface Tree {
  tree_id: string;
  device: string;
  version: string;
  nodes: Record<string, {
    id: string;
    actions: Array<{
      to: string;
      action: string;
      params: Record<string, any>;
      verification: {
        type: 'single' | 'compound';
        conditions: Array<{
          type: string;
          condition: string;
          timeout: number;
        }>;
      };
    }>;
  }>;
}
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- TypeScript strict mode enabled
- Material-UI design system
- Functional React components with hooks
- Consistent error handling and loading states
- Responsive design for mobile and desktop

## Error Handling

The application includes comprehensive error handling:

- **Network Errors**: Graceful fallback when API is unavailable
- **Database Errors**: Continues operation even if MongoDB is disconnected
- **Validation Errors**: Client-side form validation with user feedback
- **Loading States**: Visual indicators for all async operations

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new interfaces
3. Include error handling for all API calls
4. Test components in both light and dark themes
5. Ensure responsive design works on mobile devices

## License

This project is part of the VirtualPyTest framework. See the main project license for details. 