# Product Requirements Document (PRD)

## 1. Overview
**Project Name:** Automai SaaS Platform  
**Purpose:** A multi-tenant SaaS platform for test automation across web, desktop, and mobile environments.  
**Primary Users:** Developers, Testers, QA Managers, Product Managers  

## 2. Core Features
- **Test Script Development**: Web-based script editor with Git-based versioning.
- **Test Execution & Deployment**: Manual & scheduled test execution with CI/CD integration.
- **Device & Environment Control**: Manage cloud and physical test environments.
- **Reports & Analytics**: Graphical reports with pass/fail trends and error logs.
- **Multi-Tenancy**: Each customer gets an isolated workspace.
- **Role-Based Access Control**: Admin, Developer, Tester, Viewer.
- **Integrations**: GitHub, Jenkins, Grafana, Slack.

## 3. User Flow
1. **Login/Signup** → User registers or logs in.
2. **Dashboard** → Overview of test execution and project status.
3. **Test Development** → Users create/edit test scripts.
4. **Execution & Scheduling** → Tests are run manually or scheduled.
5. **Reports & Analytics** → Users analyze test results and generate reports.
6. **Team & Collaboration** → Admins manage users and permissions.

## 4. Tech Stack & APIs
- **Frontend:** Next.js, TypeScript, Tailwind CSS, Zustand.
- **Backend:** Node.js, FastAPI, PostgreSQL, Supabase, Prisma.
- **Auth:** NextAuth.js (JWT + OAuth support).
- **Storage:** Supabase or AWS S3.
- **Integrations:** Webhooks, GitHub API, Slack API.

## 5. Scope Definition
### In-Scope
✅ Multi-Tenant SaaS with role-based access  
✅ Web-based script development and execution  
✅ CI/CD and API integrations  
✅ Dashboard, Reports, and Analytics  
✅ Authentication and security (RBAC)  
✅ On-premise deployment  

### Out-of-Scope
❌ Mobile app development  
❌ AI-driven test generation (Future Enhancement)  