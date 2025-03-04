# Automai SaaS

Automai is a multi-tenant SaaS platform designed for end-to-end test automation across web, desktop, and mobile environments.

## 🚀 Quick Start Commands

```bash
npx eslint . --ext .ts,.tsx --quiet
# Restart next.js frontend
npm run dev:all

# Restart next.js frontend in debug mode with browser tool and prisma studio
npm run dev:debug

# Kill running process node
 pkill -f "node"

# Start Next.js frontend
rm -rf .next && npm run dev

# Start Electron app (will also start Next.js if not running)
npm run electron-dev

# Start browser tools server for logs/debugging
npx @agentdeskai/browser-tools-server

# Run tests
npm test  # or: npx jest tests/e2e.test.ts --runInBand

# Open Prisma database GUI
npm run prisma:studio
```

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env.development`,`.env.production`,`.env.test`
   - Update the following variables:
     ```env
     DATABASE_URL=               # Your Prisma Url
     JWT_SECRET=                # Your JWT secret key
     ```
4. If runing github codespace
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo service postgresql start 
psql --version
ALLOW MD5
sudo su -
nano /etc/postgresql/12/main/pg_hba.conf
local   all             postgres                                trust
service postgresql restart
sudo -u postgres psql -c "SHOW hba_file;"
sudo -u postgres psql 
CREATE USER automai_user WITH PASSWORD 'automai_password_123';
CREATE DATABASE automai_db OWNER automai_user;
ALTER USER automai_user CREATEDB;
npx prisma migrate dev --name init
psql -h localhost -U automai_user -d automai_db
automai_password_123
\dt
sudo netstat -plnt | grep 5432
tcp        0      0 127.0.0.1:5432          0.0.0.0:*               LISTEN      31041/postgres      
tcp6       0      0 ::1:5432                :::*                    LISTEN      31041/postgres  
sudo nano /etc/postgresql/13/main/postgresql.conf
listen_addresses = '*'
npm run dev:codespace
- package.json
    "dev": "cross-env NODE_ENV=development ENV_FILE=.env.development ts-node server.ts",
    "dev:codespace": "cross-env NODE_ENV=development ENV_FILE=.env.codespace CODESPACE=true ts-node server.ts",
    
## Running the Application

### Frontend and API

Start the Next.js development server:

```bash
npm run dev
```

Access the frontend at [http://localhost:3000](http://localhost:3000).
The API will be available at [http://localhost:3000/api](http://localhost:3000/api).

### Desktop App (Electron)

You can run the desktop app in two ways:

#### Option 1: Using Existing Next.js Server

1. Start the Next.js server first:

```bash
npm run dev
```

2. In a new terminal, start Electron:

```bash
npm run electron-dev
```

This will use the existing Next.js server running on port 3000.

#### Option 2: Standalone Mode

If Next.js is not running, simply run:

```bash
npm run electron-dev
```

This will automatically start both Next.js and Electron.

#### Building for Distribution

```bash
npm run electron-pack
```

The packaged desktop app will be available in the `dist` directory.

Note: The desktop app automatically detects if Next.js is running on port 3000 and will either use the existing server or start a new one.

For detailed desktop app documentation, see [Desktop Implementation Guide](docs/instructions/desktop.md).

API endpoints:

- Health check: `GET /api/health`
- Projects: `GET/POST /api/projects`
- Test Cases: `GET/POST /api/testcases`

## Database Management

### Setup

1. Make sure PostgreSQL is installed and running locally
2. Set up your database connection URL in `.env`:
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
DATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma migrate reset --schema=prisma/schema.prisma

# View current database schema
DATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma format --schema=prisma/schema.prisma

# Pull changes from database to schema
DATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma db pull --schema=prisma/schema.prisma

# Push schema changes to database
DATABASE_URL="postgresql://joachimndoye@localhost:5432/automai_db" npx prisma db push --schema=prisma/schema.prisma
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

Template author: Joachim N'Doye
Based on shadcn-admin repository
Crafted with 🤍 by @satnaing
https://github.com/satnaing/shadcn-admin
