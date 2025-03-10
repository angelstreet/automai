# Automai SaaS

Automai is a multi-tenant SaaS platform designed for end-to-end test automation across web, desktop, and mobile environments.

## 🚀 Quick Start Commands

```bash
npx eslint . --ext .ts,.tsx --quiet
# Restart next.js frontend
npx supabase gen types typescript --project-id wexkgcszrwxqsthahfyq > src/types/supabase.ts
code2prompt ../src --exclude="*.txt,*.md,*.mdc" --output=output.txt --line-number 

# Kill running process node
 pkill -f "node"
 npx kill-port 3000 3001

# Start Next.js frontend
rm -rf .next && npm run dev

# Start Electron app (will also start Next.js if not running)
npm run electron-dev

# Start browser tools server for logs/debugging
npx @agentdeskai/browser-tools-server

# Run tests
npm test  # or: npx jest tests/e2e.test.ts --runInBand

# Supabase studio codespace
https://vigilant-spork-q667vwj94c9x55-54323.app.github.dev

```

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:

   - For all environment update `.env`:
     ```env
     DATABASE_URL=               # Your Supabase PostgreSQL connection URL
     NEXT_PUBLIC_SUPABASE_URL=   # Your Supabase project URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY= # Your Supabase anon key
     JWT_SECRET=                # Your JWT secret key
     ```
- package.json
  "dev": "cross-env NODE_ENV=development ENV_FILE=.env.development ts-node server.ts",

Supabase vercel supabase-emerald-xylophone

## Running the Application

### Environment Mode Selection

You can run the application in different modes:

```bash
# Development mode (local PostgreSQL)
npm run dev

```

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