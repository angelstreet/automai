# Backend Implementation Guide

## Status Indicators

🔴 Not Started | 🟡 In Progress | 🟢 Completed

## Project Structure 🟢

```bash
src/
├── server/              # Backend code
│   ├── api/            # API routes
│   │   ├── auth/      # Authentication endpoints
│   │   ├── projects/  # Project management
│   │   ├── testcases/ # Test case management
│   │   └── execution/ # Test execution
│   ├── prisma/        # Database
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── config/        # Configuration
│   │   ├── env/      # Environment configs
│   │   └── passport.ts # OAuth config
│   ├── lib/           # Shared utilities
│   │   ├── supabase.ts
│   │   └── elasticsearch.ts
│   └── middleware/    # API middleware
```

## 1. Core Setup 🟢

### 1.1 Project Initialization

- [x] Initialize backend directory structure
- [x] Set up TypeScript configuration
- [x] Configure ESLint and Prettier
- [x] Set up environment variables

### 1.2 Dependencies Installation

- [x] Core dependencies installed
- [x] Database dependencies installed
- [ ] Testing framework dependencies
- [ ] Logging dependencies

## 2. Database & Storage Setup 🟡

### 2.1 Prisma Schema Setup 🟢

```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String?
  name      String?
  role      String    @default("USER")
  provider  String?
  providerId String?
  providerAccessToken String?
  providerRefreshToken String?
  // ... other fields
}

model Project {
  id        String     @id @default(uuid())
  name      String
  ownerId   String
  createdAt DateTime   @default(now())
  testcases TestCase[]
}

model TestCase {
  id        String     @id @default(uuid())
  projectId String
  name      String
  steps     Json
  lockedBy  String?
  createdAt DateTime   @default(now())
  executions Execution[]
}

model Execution {
  id          String    @id @default(uuid())
  testcaseId  String
  projectId   String
  status      String    @default("pending")
  reportUrl   String?
  createdAt   DateTime  @default(now())
}
```

### 2.2 Supabase Configuration 🔴

- [ ] Set up Supabase project
- [ ] Configure authentication
- [ ] Set up storage buckets for:
  - Test reports
  - Screenshots
  - Videos
  - Execution logs

## 3. API Implementation 🟡

### 3.0 Authentication & Authorization 🟡

#### OAuth Setup Instructions

##### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the OAuth2 API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" or "Google OAuth2 API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     ```
     Development: http://localhost:5001/api/auth/google/callback
     Production: https://your-domain.com/api/auth/google/callback
     ```
5. Store credentials:
   - Add to appropriate .env file:
     ```
     GOOGLE_CLIENT_ID="your-client-id"
     GOOGLE_CLIENT_SECRET="your-client-secret"
     ```

##### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "OAuth Apps" > "New OAuth App"
3. Register application:
   - Application name: "Automai" (or your app name)
   - Homepage URL: Your application URL
   - Authorization callback URLs:
     ```
     Development: http://localhost:5001/api/auth/github/callback
     Production: https://your-domain.com/api/auth/github/callback
     ```
4. Store credentials:
   - Add to appropriate .env file:
     ```
     GITHUB_CLIENT_ID="your-client-id"
     GITHUB_CLIENT_SECRET="your-client-secret"
     ```

##### Environment-Specific Configuration

- Development (.env.development):
  ```env
  NODE_ENV=development
  PORT=5001
  GOOGLE_CALLBACK_URL="http://localhost:5001/api/auth/google/callback"
  GITHUB_CALLBACK_URL="http://localhost:5001/api/auth/github/callback"
  ```
- Production (.env.production):
  ```env
  NODE_ENV=production
  PORT=5001
  GOOGLE_CALLBACK_URL="https://your-domain.com/api/auth/google/callback"
  GITHUB_CALLBACK_URL="https://your-domain.com/api/auth/github/callback"
  ```

#### Authentication Features

- [x] JWT implementation
- [x] Multi-tenant support
- [x] Session management
- [x] Role-based access control
- [x] Password reset functionality
- [x] Email verification
- [ ] OAuth Providers:
  - [ ] Google authentication
  - [ ] GitHub authentication
- [ ] Rate limiting
- [ ] Session management
- [ ] Security headers

### 3.1 Project Management 🟢

- [x] POST /api/projects (Create)
- [x] GET /api/projects (List)
- [x] GET /api/projects/:id (Read)
- [x] PUT /api/projects/:id (Update)
- [x] DELETE /api/projects/:id (Delete)

### 3.2 Test Case Management 🟢

- [x] POST /api/testcases (Create)
- [x] GET /api/testcases?project_id=... (List)
- [x] GET /api/testcases/:id (Read)
- [x] PUT /api/testcases/:id (Update)
- [x] DELETE /api/testcases/:id (Delete)
- [x] POST /api/testcases/:id/lock (Lock)
- [x] POST /api/testcases/:id/unlock (Unlock)

### 3.3 Test Execution 🔴

- [ ] POST /api/execute (Local)
- [ ] POST /api/cloud-execute (Cloud)
- [ ] GET /api/executions (List)
- [ ] GET /api/executions/:id (Status)

## 4. Test Execution Engine 🔴

### 4.1 Local Execution

- [ ] Playwright setup for web testing
- [ ] Appium setup for mobile testing
- [ ] Pywinauto setup for desktop testing
- [ ] Test execution orchestrator
- [ ] Report generation (HTML)

### 4.2 Cloud Execution (Future)

- [ ] VM provisioning system
- [ ] Docker container setup
- [ ] Cloud execution orchestrator
- [ ] Load balancing

## 5. Logging & Monitoring 🔴

### 5.1 Elasticsearch Setup

- [ ] Configure Elasticsearch cluster
- [ ] Set up Kibana dashboards
- [ ] Implement log shipping

### 5.2 Monitoring

- [ ] Execution metrics
- [ ] Performance monitoring
- [ ] Error tracking
- [ ] Real-time log viewing

## 6. Integration Testing 🔴

### 6.1 API Tests

- [ ] Project management endpoints
- [ ] Test case endpoints
- [ ] Execution endpoints
- [ ] Authentication flows

### 6.2 End-to-End Tests

- [ ] Local execution flows
- [ ] Cloud execution flows
- [ ] Report generation
- [ ] Storage integration

## Development Guidelines

### Environment Setup

```bash
# Required environment variables
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
DATABASE_URL=your_database_url
ELASTICSEARCH_URL=your_elasticsearch_url
JWT_SECRET=your_jwt_secret

# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Running the Backend

```bash
# Development
npm run server:dev

# Production
npm run server:prod

# Testing
npm run server:test
```

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Development migrations
npx prisma migrate dev

# Production migrations
npx prisma migrate deploy

# Reset database
npx prisma reset

# Seed database
npm run prisma:seed        # Development
npm run prisma:seed:test   # Testing
```

## Security Checklist 🔴

- [ ] Implement rate limiting
- [ ] Set up security headers
- [ ] Enable CORS properly
- [ ] Implement input validation
- [ ] Set up audit logging
- [ ] Configure SSL/TLS
- [ ] Implement API authentication
- [ ] Set up error handling
- [ ] Configure session management
- [ ] Implement data validation

## Deployment Checklist 🔴

- [ ] Environment variables configuration
- [ ] Database migrations
- [ ] Storage bucket setup
- [ ] Elasticsearch cluster setup
- [ ] API documentation
- [ ] Security review
- [ ] Performance testing
- [ ] Load testing
- [ ] SSL/TLS setup
- [ ] Domain configuration
- [ ] Monitoring setup
- [ ] Backup configuration

## Status Tracking

To mark a task as complete, change its status emoji:

- 🔴 → 🟡 → 🟢
- Also check the checkbox: [ ] → [x]

Remember to commit your changes with clear messages indicating what was completed.
