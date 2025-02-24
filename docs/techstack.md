# Tech Stack & Dependencies

## 1. Frontend
- **Framework**: Next.js (React) + TypeScript
- **State Management**: Zustand / React Context
- **Styling**: Tailwind CSS, shadcn-ui
- **Authentication**: NextAuth.js (JWT, OAuth via Supabase, Plan-Based Access Control)
- **Routing**: Next.js App Router
- **Internationalization**: Next-translate / i18next
- **Component Library**: Shadcn, Lucide-react (icons)
- **Testing**: Jest, React Testing Library
- **Package Manager**: npm / pnpm
- **Desktop Integration**:
  - Electron for desktop app wrapper
  - electron-store for persistent storage
  - simple-git for Git operations
  - Cross-platform support (Windows, macOS, Linux)
  - Shared server architecture with web version

## 2. Backend
- **Language & Frameworks**: 
  - Node.js (Express) for API server
  - Next.js API routes for web endpoints
  - Electron IPC for desktop features
  - FastAPI (Python) for ML tasks
- **Database**: 
  - PostgreSQL (Supabase)
  - Prisma ORM for API Access
  - electron-store for desktop local storage
- **Authentication**: 
  - NextAuth.js (JWT, OAuth via Supabase)
  - Multi-Tenant Support
  - Desktop-specific auth handling
- **API**: 
  - REST & GraphQL support
  - IPC (Inter-Process Communication) for desktop features
- **Subscription Management**: Stripe / Paddle Integration
- **Execution Queue**: BullMQ / RabbitMQ for test execution
- **CI/CD**: GitHub Actions, Jenkins (Planned)
- **Security**: 
  - Role-Based Access Control (RBAC)
  - Rate Limiting
  - Subscription-Based API Restrictions
  - Desktop-specific security measures

## 3. Storage & Integrations
- **File Storage**: 
  - Supabase Storage / AWS S3 (Cloud storage)
  - Local filesystem (Desktop version)
  - Hybrid storage management
- **Logging & Monitoring**: 
  - Kibana & Elasticsearch (Cloud logging)
  - Local logging for desktop version
  - Console logging for development
- **Error Tracking**: 
  - Sentry, LogRocket for web version
  - Electron error handling for desktop
- **Version Control**: 
  - GitHub / GitLab integration
  - Local Git operations in desktop version
  - Test case versioning
- **Notifications**: 
  - Slack, MS Teams integration
  - Desktop notifications (Electron)
- **Testing Infrastructure**: 
  - Playwright (Primary for automation)
  - Puppeteer, Cypress for E2E testing
  - Local test execution in desktop version
- **Containerization & Deployment**: 
  - Docker for web services
  - Electron-builder for desktop distribution
  - Kubernetes for cloud execution (Future)

## 4. Deployment Strategy
- **Web Frontend:** Vercel (Preferred) / Netlify
- **Desktop App:**
  - electron-builder for packaging
  - Auto-updates support
  - Platform-specific builds (Windows, macOS, Linux)
- **Backend:** 
  - Supabase (Preferred)
  - AWS Lambda / Firebase Functions
  - Local services for desktop version
- **Database:** 
  - Supabase (PostgreSQL)
  - Prisma ORM for DB Access
  - Local storage for desktop
- **Infrastructure as Code:** Terraform / Pulumi

## 5. Test Execution & Reporting
- **Local Execution:** 
  - Playwright runs on local browser
  - Desktop-integrated test runner
  - Headless or interactive mode
- **Cloud Execution:** 
  - Planned execution on managed VMs
  - Parallel test execution support
- **Test Reports:**
  - Local Reports: Filesystem storage in desktop version
  - Cloud Reports: Supabase Storage
  - HTML report generation
  - Kibana Integration for cloud logs
  - Unified reporting interface
  - Desktop-specific report viewer

## 6. API Documentation
- **Documentation Tools**: Swagger / Postman Collections
- **API Standards**: OpenAPI 3.0 / GraphQL Schema
- **Desktop IPC Endpoints**:
  - `store-get/set`: Local data persistence
  - `run-python`: Python script execution
  - `git-sync`: Repository synchronization
- **Web API Endpoints**:
  - `POST /api/projects`: Create new projects
  - `POST /api/testcases`: Add test cases
  - `POST /api/execute`: Run test cases
  - `GET /api/executions`: Fetch results
  - `POST /api/testcases/:id/lock`: Lock for editing
  - `POST /api/testcases/:id/unlock`: Release lock

## 7. Development Environment
- **IDE Support**: VS Code / WebStorm
- **Debug Tools**:
  - Chrome DevTools for web
  - Electron DevTools for desktop
  - React DevTools integration
- **Hot Reload**: 
  - Next.js hot module replacement
  - Electron development server
- **Cross-platform**: 
  - Web browser compatibility
  - Desktop OS support
  - Shared codebase management

---
This tech stack supports both web and desktop platforms, with shared core functionality and platform-specific optimizations. 🚀

