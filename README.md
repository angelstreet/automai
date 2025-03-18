# Automai SaaS

## Project Overview

AutomAI is a multi-tenant SaaS platform designed to simplify deployment workflows and infrastructure management for technical and non-technical users alike. It serves as an intuitive interface to existing tools like Jenkins, SSH, Docker, and Portainer, allowing users to deploy applications without deep technical knowledge.

## Core Purpose

### Your Simple Interface for Powerful Automation Tools.
Automai brings together the powerful automation tools your IT team already uses and makes them accessible through one simple interface. We don't reinvent the wheel - we make it easier to drive.

### What Makes Automai Different?

No New Tools to Learn: We connect to your existing systems and scripts, making them easier to manage
Simplified Complexity: Turn complicated IT processes into easy-to-use workflows anyone can understand
Central Management: See and control all your automation activities in one place
Bridge Between Teams: Help technical and non-technical staff collaborate effectively
Make Existing Infrastructure Work Harder: Get more value from your current IT investments

### Perfect For:

Business Leaders: Access powerful automation without needing technical expertise
Department Managers: Request and monitor IT processes relevant to your team
IT Managers: Delegate routine tasks while maintaining oversight and security
Operations Teams: Create self-service options for common requests

### Key Benefits

- User-friendly dashboard that connects to sophisticated backend tools
- Secure connections to your existing servers and repositories
- Simple scheduling interface for your current automation scripts
- Team workspaces that respect your organizational structure
- Available on web or desktop for maximum flexibility

Automai doesn't replace your existing tools - it makes them work better together and puts them at everyone's fingertips.

## Technology Stack

- **Frontend**: Next.js App Router, React, Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API routes and Server Actions
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **CI/CD Integration**: Jenkins (planned)
- **Deployment Targets**: SSH servers, Docker, Portainer (Docker in progress)
- **Repository Integration**: GitHub, GitLab, Gitea

## Architecture

The application follows a strict three-layer architecture:

1. **Server DB Layer (Core)**
   - Direct database interaction via Supabase
   - Located in `/src/lib/supabase/db*.ts` files
   - Feature-specific DB modules in `/src/lib/supabase/db-{feature}/`

2. **Server Actions Layer (Bridge)**
   - Business logic and orchestration
   - Located in `/src/app/actions/*.ts` and feature-specific action files
   - Handles validation, error management, and calls to DB Layer

3. **Client Hooks Layer (Interface)**
   - React hooks for frontend components
   - Manages loading/error states and data caching
   - Calls Server Actions (never directly to DB Layer)

## 🚀 Quick Start Commands

```bash
# Start Next.js frontend
rm -rf .next && npm run dev

# Kill running process node
 pkill -f "node"
 npx kill-port 3000 3001

# Export supabase tables
npx supabase gen types typescript --project-id db?pwd > src/types/supabase.ts
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

## Build/Test/Lint Commands

```bash
# Development
npm run dev               # Run full dev server with custom server
npm run build             # Create production build
npm run start             # Start production server
npm run lint              # Run ESLint
npm run lint:fix          # Fix ESLint issues
npm run format            # Run Prettier formatter
npm run format:check      # Check formatting without fixing
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:e2e          # Run end-to-end tests
npm run analyze           # Analyze bundle size
npm run browser-tools     # Run browser tools server

# Electron
npm run electron-dev      # Run Electron in development mode
npm run electron-build    # Build Electron application
npm run electron-pack     # Package Electron application
``` 

---

Happy Testing!

Template author: Joachim N'Doye
Based on shadcn-admin repository
Crafted with 🤍 by @satnaing
https://github.com/satnaing/shadcn-admin