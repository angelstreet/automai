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

## 2. Backend
- **Language & Frameworks**: Node.js (Express) or FastAPI (Python for ML tasks)
- **Database**: PostgreSQL (Supabase) / Prisma ORM for API Access
- **Authentication**: NextAuth.js (JWT, OAuth via Supabase, Multi-Tenant Support)
- **API**: REST & GraphQL support
- **Subscription Management**: Stripe / Paddle Integration
- **Execution Queue**: BullMQ / RabbitMQ for test execution
- **CI/CD**: GitHub Actions, Jenkins (Planned)
- **Security**: Role-Based Access Control (RBAC), Rate Limiting, Subscription-Based API Restrictions

## 3. Storage & Integrations
- **File Storage**: Supabase Storage / AWS S3 (For test execution reports, screenshots & videos)
- **Logging & Monitoring**: Kibana & Elasticsearch (For test execution logs & analytics)
- **Error Tracking**: Sentry, LogRocket
- **Version Control**: GitHub / GitLab (Test cases & automation scripts are Git versioned)
- **Notifications**: Slack, MS Teams (Planned for future alerting)
- **Testing Infrastructure**: Playwright (Primary for automation), Puppeteer, Cypress for E2E testing
- **Containerization & Deployment**: Docker, Kubernetes (Future Cloud Execution)

## 4. Deployment Strategy
- **Frontend:** Hosted on Vercel (Preferred) / Netlify
- **Backend:** Supabase (Preferred) / AWS Lambda / Firebase Functions
- **Database:** Supabase (PostgreSQL) / Prisma ORM for DB Access
- **Infrastructure as Code:** Terraform / Pulumi

## 5. Test Execution & Reporting
- **Local Execution:** Playwright runs on the user’s local browser (headless or interactive mode).
- **Cloud Execution:** Planned execution on managed VMs for parallel test execution.
- **Test Reports:**
  - **Local Reports:** Logs, screenshots, and video stored in filesystem.
  - **Report Generation:** Each test execution generates an **HTML report (`report.html`)**, which is stored in Supabase Storage.
  - **Kibana Integration:** Execution logs indexed in Elasticsearch for reporting & filtering.
  - **Execution Table UI:** Displays **execution status, timestamps, pass/fail results, and report links**.
  - **Direct Report Access:** Users open `report.html` via the execution table or Kibana logs.

## 6. API Documentation
- **Documentation Tools**: Swagger / Postman Collections
- **API Standards**: OpenAPI 3.0 / GraphQL Schema
- **Updated Endpoints for Test Execution:**
  - `POST /api/projects` → Create new projects.
  - `POST /api/testcases` → Add test cases with Playwright steps.
  - `POST /api/execute` → Run test cases locally or on cloud.
  - `GET /api/executions` → Fetch test execution results (with `report.html` stored in Supabase).
  - `POST /api/testcases/:id/lock` → Lock test case for editing.
  - `POST /api/testcases/:id/unlock` → Unlock test case for editing.

---
This tech stack update ensures **structured test execution, cloud storage, execution tracking, and integration with Kibana & Supabase.** 🚀

