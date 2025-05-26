# VirtualPyTest Supabase Setup Guide

## 🎯 Overview
This guide will help you set up the VirtualPyTest web interface with your Supabase database.

## ✅ Prerequisites
- Supabase project with VirtualPyTest tables already created
- Python 3.8+ installed
- Node.js 16+ installed (for the frontend)

## 🔧 Backend Setup (Flask API)

### 1. Install Python Dependencies
```bash
cd automai/virtualpytest/src/web
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the `src/web` directory:

```bash
# Copy the example file
cp env_example.txt .env
```

Edit `.env` with your Supabase credentials:
```env
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.wexkgcszrwxqsthahfyq.supabase.co:5432/postgres
FLASK_ENV=development
FLASK_DEBUG=True
```

**Your Supabase Connection Details:**
- Project URL: `https://wexkgcszrwxqsthahfyq.supabase.co`
- Database Host: `db.wexkgcszrwxqsthahfyq.supabase.co`
- Port: `5432`
- Database: `postgres`

### 3. Get Your Database Password
1. Go to your Supabase dashboard
2. Navigate to Settings > Database
3. Copy the connection string or reset your database password if needed

### 4. Test the Connection
```bash
python app.py
```

You should see:
```
Supabase connected successfully!
* Running on all addresses (0.0.0.0)
* Running on http://127.0.0.1:5009
```

## 🎨 Frontend Setup (React)

### 1. Install Node Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🔒 Team-Based Access Control

The application uses team-based access control:

### Demo Mode (Current Setup)
- **Default Team ID**: `550e8400-e29b-41d4-a716-446655440000`
- **Default User ID**: `550e8400-e29b-41d4-a716-446655440001`

### Production Setup
For production, you'll need to:
1. Implement proper authentication (JWT tokens)
2. Extract `team_id` and `user_id` from authenticated sessions
3. Update the `get_team_id()` and `get_user_id()` functions in `app.py`

### Custom Team/User Headers (Testing)
You can test with different teams by sending headers:
```bash
curl -H "X-Team-ID: your-team-id" -H "X-User-ID: your-user-id" http://localhost:5009/api/testcases
```

## 📊 API Endpoints

### Health Check
```bash
GET /api/health
```

### Test Cases
```bash
GET /api/testcases          # List all test cases
POST /api/testcases         # Create test case
GET /api/testcases/{id}     # Get specific test case
PUT /api/testcases/{id}     # Update test case
DELETE /api/testcases/{id}  # Delete test case
```

### Navigation Trees
```bash
GET /api/trees              # List all trees
POST /api/trees             # Create tree
GET /api/trees/{id}         # Get specific tree
PUT /api/trees/{id}         # Update tree
DELETE /api/trees/{id}      # Delete tree
```

### Campaigns
```bash
GET /api/campaigns          # List all campaigns
POST /api/campaigns         # Create campaign
GET /api/campaigns/{id}     # Get specific campaign
PUT /api/campaigns/{id}     # Update campaign
DELETE /api/campaigns/{id}  # Delete campaign
```

### Statistics
```bash
GET /api/stats              # Get dashboard statistics
```

## 🐛 Troubleshooting

### Connection Issues
1. **"Supabase connection failed"**
   - Check your `.env` file exists and has correct credentials
   - Verify your Supabase project is active
   - Test connection string manually

2. **"psycopg2 not found"**
   ```bash
   pip install psycopg2-binary
   ```

3. **"Permission denied"**
   - Ensure your Supabase user has proper permissions
   - Check RLS policies are correctly configured

### Database Issues
1. **"relation does not exist"**
   - Ensure you've run the migration script in Supabase
   - Check table names match exactly

2. **"RLS policy violation"**
   - Verify you're using the correct team_id
   - Check that your user is a member of the team

## 🚀 Next Steps

1. **Test the Interface**: Open `http://localhost:5173` and create some test cases
2. **Add Authentication**: Implement proper user authentication
3. **Configure Teams**: Set up your actual teams and users in Supabase
4. **Deploy**: Deploy both frontend and backend to production

## 📝 Notes

- All data is isolated by team - users can only see data from their teams
- The database schema includes proper foreign key constraints and RLS policies
- JSON fields (steps, nodes) are automatically serialized/deserialized
- All timestamps are handled automatically by the database 