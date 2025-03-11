# Automai SaaSpaces Setup Guide

Automai is a multi-tenant SaaS platform designed for end-to-end test automation across web, desktop, and mobile environments.

## 🚀 Quick Start Commands

# 1. Start PostgreSQL

```bashcompose up -d
npx eslint . --ext .ts,.tsx --quiet
# Restart next.js frontendions
npm run dev:allate deploy

# Restart next.js frontend in debug mode with browser tool and prisma studio
npm run dev:debug
```

# Kill running process node

pkill -f "node"cker Configuration

# Start Next.js frontend provides a consistent database environment:

rm -rf .next && npm run dev

```yaml
# Start Electron app (will also start Next.js if not running)
npm run electron-dev
  postgres:
# Start browser tools server for logs/debugging
npx @agentdeskai/browser-tools-server
    environment:
      POSTGRES_USER: automai_user
      POSTGRES_PASSWORD: automai_password_123npm test  # or: npx jest tests/e2e.test.ts --runInBand
      POSTGRES_DB: automai_db
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:e the repository.
```

## Environment Setup npm install

1. Create `.env` file:ment variables:
   ```env   - Copy `.env.example`to`.env.development`,`.env.production`,`.env.test`
   DATABASE_URL="postgresql://automai_user:automai_password_123@localhost:5432/automai_db"ariables:
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key" DATABASE_URL= # Your Prisma Url

````# Your JWT secret key

## Troubleshooting
## Running the Application
Common issues and solutions:
### Frontend and API
```bash
# Check container logsStart the Next.js development server:
docker-compose logs postgres

# Reset database
docker-compose down -v && docker-compose up -d

# Verify database connectionAccess the frontend at [http://localhost:3000](http://localhost:3000).
docker exec -it automai-postgres-1 psql -U automai_user -d automai_dbhttp://localhost:3000/api](http://localhost:3000/api).
````

## Port Configuration

You can run the desktop app in two ways:
| Port | Service | Purpose |
|------|------------|-------------------|tion 1: Using Existing Next.js Server
| 3000 | Next.js | Web Application |
| 5432 | PostgreSQL | Database |All Prisma commands are available as npm scripts. Run them from the project root:`bash# Generate Prisma client after schema changesnpm run prisma:generate# Create and apply migrationsnpm run prisma:migrate# Apply migrations in productionnpm run prisma:migrate:prod# Open Prisma Studio (GUI database browser)npm run prisma:studio# Seed the database with initial datanpm run prisma:seed`### Common Database Tasks`bash# Reset database (drops all data and recreates tables)DATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma migrate reset --schema=prisma/schema.prisma# View current database schemaDATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma format --schema=prisma/schema.prisma# Pull changes from database to schemaDATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma db pull --schema=prisma/schema.prisma# Push schema changes to databaseDATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma db push --schema=prisma/schema.prisma`Note: All Prisma commands require the DATABASE_URL environment variable. The npm scripts include this automatically. If running npx commands directly, make sure to provide both the DATABASE_URL and the correct schema path as shown above.## Running Tests
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

Template author: Joachim N'Doye
Based on shadcn-admin repository
Crafted with 🤍 by @satnaing
https://github.com/satnaing/shadcn-admin
