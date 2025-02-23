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
All Prisma commands are available as npm scripts. Run them from the project root:

```bash
# Generate Prisma client after schema changes
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# Apply migrations in production
npm run prisma:migrate:prod

# Open Prisma Studio (GUI database browser)
npm run prisma:studio

# Seed the database with initial data
npm run prisma:seed
```

### Common Database Tasks
```bash
# Reset database (drops all data and recreates tables)
DATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma migrate reset --schema=src/server/prisma/schema.prisma

# View current database schema
DATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma format --schema=src/server/prisma/schema.prisma

# Pull changes from database to schema
DATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma db pull --schema=src/server/prisma/schema.prisma

# Push schema changes to database
DATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma db push --schema=src/server/prisma/schema.prisma
```

Note: All Prisma commands require the DATABASE_URL environment variable. The npm scripts include this automatically. If running npx commands directly, make sure to provide both the DATABASE_URL and the correct schema path as shown above.

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

Template author: Joachim N. Doye
Based on shadcn-admin repository
Crafted with 🤍 by @satnaing
https://github.com/satnaing/shadcn-admin