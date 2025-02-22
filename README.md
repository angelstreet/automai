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

Initialize and manage the database:
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database
npm run prisma:seed
```

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