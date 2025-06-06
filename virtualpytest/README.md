# VirtualPyTest

VirtualPyTest is an open-source web-based test management tool for creating, organizing, and managing automated test cases, campaigns, and navigation trees.

## Features

- **Test Case Management**: Create and manage test cases with step-by-step instructions
- **Campaign Organization**: Group test cases into campaigns for organized execution
- **Navigation Trees**: Define application navigation structures for test automation
- **Team-based Access**: Multi-tenant architecture with team-based data isolation
- **Modern UI**: Clean, responsive interface with light/dark/system theme support
- **PostgreSQL Backend**: Robust database with Row Level Security (RLS)

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL database (we recommend Supabase for easy setup)

### 1. Database Setup

#### Option A: Using Supabase (Recommended)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key from Settings > API

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a new database: `createdb virtualpytest`

### 2. Backend Setup

1. Navigate to the web directory:
   ```bash
   cd src/web
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your database credentials
   nano .env
   ```

4. **Automated Setup** - Run the setup script:
   ```bash
   python setup_database.py
   ```
   
   This script will:
   - Verify your database connection
   - Create all required tables and indexes
   - Set up Row Level Security policies
   - Insert demo data for testing

   **Manual Setup** - Alternatively, you can set up the database manually:
   ```bash
   # For Supabase: Copy and paste virtualpytest_schema.sql in the SQL Editor
   # For PostgreSQL: Run the schema file
   psql -d virtualpytest -f virtualpytest_schema.sql
   ```

5. Start the Flask backend:
   ```bash
   python app.py
   ```

   The API will be available at `http://localhost:5009`

### 3. Frontend Setup

1. Navigate to the React app directory:
   ```bash
   cd src
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The web interface will be available at `http://localhost:5073`

## Database Schema

The minimal schema includes these core tables:

- **teams**: Organization/tenant isolation
- **profiles**: User management
- **team_members**: Team membership and roles
- **test_cases**: Individual test case definitions
- **navigation_trees**: Application navigation structures
- **campaigns**: Test case groupings
- **test_results**: Test execution results and history

All tables include Row Level Security (RLS) policies to ensure team-based data isolation.

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/testcases` - List all test cases
- `POST /api/testcases` - Create new test case
- `PUT /api/testcases/<id>` - Update test case
- `DELETE /api/testcases/<id>` - Delete test case
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create new campaign
- `PUT /api/campaigns/<id>` - Update campaign
- `DELETE /api/campaigns/<id>` - Delete campaign
- `GET /api/trees` - List all navigation trees
- `POST /api/trees` - Create new navigation tree
- `PUT /api/trees/<id>` - Update navigation tree
- `DELETE /api/trees/<id>` - Delete navigation tree
- `GET /api/stats` - Get dashboard statistics

## Configuration

### Environment Variables

Create a `.env` file in the `src/web` directory with:

```env
# For Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# For local PostgreSQL (alternative)
# DATABASE_URL=postgresql://username:password@localhost:5432/virtualpytest
```

### Default Data

The schema includes a demo team and user for immediate testing:
- Team: "Demo Team"
- User: "demo@virtualpytest.com"

## Troubleshooting

### Common Issues

1. **"Port 5009 is in use"**
   ```bash
   # Find and kill the process using port 5009
   lsof -ti:5009 | xargs kill -9
   ```

2. **Database connection errors**
   - Verify your environment variables in `.env`
   - Check that your Supabase project is active
   - Ensure your API key has the correct permissions

3. **Frontend not loading**
   - Make sure the backend is running on port 5009
   - Check browser console for errors
   - Verify Node.js dependencies are installed

### Setup Script Help

Run the setup script with help flag for more information:
```bash
python setup_database.py --help
```

## Development

### Project Structure

```
src/
├── web/
│   ├── app.py                    # Flask backend
│   ├── setup_database.py         # Database setup script
│   ├── virtualpytest_schema.sql  # Database schema
│   ├── env.example               # Environment template
│   ├── requirements.txt          # Python dependencies
│   ├── utils/
│   │   └── supabase_utils.py     # Database utilities
│   └── src/                      # React frontend
│       ├── components/           # UI components
│       ├── contexts/             # React contexts
│       ├── pages/                # Page components
│       └── types.ts              # TypeScript types
```

### Adding New Features

1. Update the database schema in `virtualpytest_schema.sql`
2. Add corresponding API endpoints in `app.py`
3. Update the frontend components as needed
4. Ensure RLS policies are properly configured for new tables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include steps to reproduce any bugs

## Roadmap

- [ ] Test execution engine integration
- [ ] Real-time test result updates
- [ ] Advanced reporting and analytics
- [ ] CI/CD pipeline integration
- [ ] Test scheduling and automation
- [ ] Plugin system for custom test types
