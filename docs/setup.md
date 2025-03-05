# AutomAI Setup Guide

This guide walks you through setting up the AutomAI application for development and deployment.

## Prerequisites

- Node.js 18.x or higher
- PostgreSQL 13.x or higher
- Git
- npm or yarn

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/automai.git
cd automai
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

Create environment files for different environments:

1. Copy `.env.example` to `.env.development`, `.env.production`, and `.env.test`
2. Update the environment variables in each file:

#### Development Environment (.env.development)

```
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/automai_db"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-development-secret-key"
JWT_SECRET="your-development-jwt-secret"

# OAuth - Google
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/callback/google"

# OAuth - GitHub
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:3000/api/auth/callback/github"
```

#### Production Environment (.env.production)

```
# Server Configuration
NODE_ENV=production
PORT=3000

# Database - Either local PostgreSQL or Supabase
DATABASE_URL="postgresql://postgres:password@your-postgres-host:5432/automai_db"

# Supabase (Production Only)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Auth
NEXTAUTH_URL="https://your-production-domain.com"
NEXTAUTH_SECRET="your-production-secret-key"
JWT_SECRET="your-production-jwt-secret"

# OAuth - Google
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="https://your-production-domain.com/api/auth/callback/google"

# OAuth - GitHub
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="https://your-production-domain.com/api/auth/callback/github"
```

### 4. Database Setup

1. Create a PostgreSQL database:

```bash
# Using psql
psql -U postgres
```

```sql
CREATE DATABASE automai_db;
CREATE USER automai_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE automai_db TO automai_user;
\q
```

2. Run Prisma migrations:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed
```

### 5. Start Development Server

```bash
# Run Next.js development server
npm run dev

# Or run in debug mode
npm run dev:debug
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Running in Different Environments

### Development Mode (Local Database)

```bash
npm run dev
```

### Production Mode (Supabase)

```bash
# Use production environment variables
cross-env ENV_FILE=.env.production npm run dev
```

### Test Mode

```bash
# Run tests with test environment
npm test
```

## Desktop Application

### Running the Electron App

```bash
# Start Electron development
npm run electron-dev
```

### Building the Desktop App

```bash
# Build for production
npm run electron-pack
```

Packaged desktop applications will be available in the `dist` directory.

## GitHub Codespaces Setup

If running in GitHub Codespaces:

```bash
# Update packages
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo service postgresql start

# Configure PostgreSQL for authentication
sudo su -
nano /etc/postgresql/12/main/pg_hba.conf
# Change 'peer' to 'trust' for local connections
# Then restart PostgreSQL
service postgresql restart

# Create database and user
sudo -u postgres psql -c "CREATE USER automai_user WITH PASSWORD 'automai_password_123';"
sudo -u postgres psql -c "CREATE DATABASE automai_db OWNER automai_user;"
sudo -u postgres psql -c "ALTER USER automai_user CREATEDB;"

# Initialize the database
npx prisma migrate dev --name init

# Use codespace-specific start command
npm run dev:codespace
```

## Environment Specific Configurations

### Environment Detection

The application detects the current environment using:

```typescript
// src/lib/env.ts
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isTest = () => process.env.NODE_ENV === 'test';
export const isCodespace = () => Boolean(process.env.CODESPACE);
```

### Supabase Integration

In production, the application can use Supabase for both database and authentication:

```typescript
// src/lib/env.ts
export const isUsingSupabase = () => {
  return isProduction() && 
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && 
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection problems:

1. Check that PostgreSQL is running:
   ```bash
   sudo service postgresql status
   ```

2. Verify your connection string in the `.env` file:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
   ```

3. Test the connection directly:
   ```bash
   psql -U username -d database_name -h localhost
   ```

### Authentication Issues

For NextAuth.js issues:

1. Verify your OAuth credentials:
   - Check that redirect URLs match exactly what's configured in OAuth providers
   - Ensure all required environment variables are set

2. Clear cookies and browser cache if login persists

3. Check NextAuth.js logs:
   ```bash
   # Enable debug mode in .env file
   NEXTAUTH_DEBUG=true
   ```

### Electron/Desktop App Issues

If the desktop app fails to start:

1. Check that Next.js server is running on port 3000

2. Look for error messages in the console

3. Try running with debugging:
   ```bash
   npm run electron-dev -- --debug
   ```

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure the environment variables in Vercel
3. Set the build command:
   ```
   npm run build
   ```

### Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t automai .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 --env-file .env.production automai
   ```

Or use Docker Compose:

```bash
docker-compose up -d
```