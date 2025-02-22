# Automai SaaS

Automai is a multi-tenant SaaS platform designed for end-to-end test automation across web, desktop, and mobile environments.

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the following variables:
     ```env
     PORT=5001                   # Server port
     DATABASE_URL=               # Your PostgreSQL connection string
     SUPABASE_URL=              # Your Supabase URL
     SUPABASE_KEY=              # Your Supabase key
     JWT_SECRET=                # Your JWT secret key
     ```

## Running the Application

### Frontend
Start the Next.js development server:
```bash
npm run dev
```
Access the frontend at [http://localhost:3000](http://localhost:3000).

### Backend
Start the backend server:
```bash
npm run server:dev
```
The API will be available at [http://localhost:5001](http://localhost:5001).

API endpoints:
- Health check: `GET /api/health`
- Projects: `GET/POST /api/projects`
- Test Cases: `GET/POST /api/testcases`

## Database Management

### Setup
1. Make sure PostgreSQL is installed and running locally
2. Set up your database connection URL in `src/server/config/env/.env.development`:
   ```env
   DATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db"
   ```

### Prisma Commands
```bash
# Navigate to server directory
cd src/server

# Generate Prisma client after schema changes
npx prisma generate

# Create and apply migrations
npx prisma migrate dev

# Apply migrations in production
npx prisma migrate deploy

# Seed the database with initial data
npx prisma db seed

# Open Prisma Studio (GUI database browser)
npx prisma studio
```

### Common Database Tasks
```bash
# Reset database (drops all data and recreates tables)
npx prisma migrate reset

# View current database schema
npx prisma format

# Pull changes from database to schema
npx prisma db pull

# Push schema changes to database
npx prisma db push
```

Note: Always ensure you're in the `src/server` directory when running Prisma commands, as the schema is located at `prisma/schema.prisma`.

## Running Tests

To run end-to-end tests, execute:
```bash
npx jest tests/e2e.test.ts --runInBand
```
Alternatively, if configured in package.json, run:
```bash
npm test
```

## Running the Browser MCP Tool

Use the following command to run the browser MCP tool, which helps analyze browser logs and console errors:
```bash
npx @agentdeskai/browser-tools-server
```

## Additional Documentation

For detailed project documentation, architecture, and advanced configuration, please refer to the docs in the `docs` directory.

---

Happy Testing!