# Tech Stack & Dependencies

## 1. Frontend
- **Framework**: Next.js (React) + TypeScript
- **Styling**: Tailwind CSS, shadcn-ui
- **State Management**: Zustand / React Context
- **Authentication**: NextAuth.js (JWT, OAuth via Supabase, Plan-Based Access Control)
- **Routing**: Next.js App Router
- **Internationalization**: Next-translate / i18next
- **Component Library**: Shadcn, Lucide-react (icons)
- **Testing**: Jest, React Testing Library
- **Package Manager**: npm / pnpm

## 2. Backend
- **Language & Frameworks**: Node.js, FastAPI (Python for ML tasks)
- **Database**: PostgreSQL (Supabase) / Prisma ORM for API Access
- **Authentication**: NextAuth.js (JWT, OAuth via Supabase, Multi-Tenant Support)
- **API**: REST & GraphQL support
- **Subscription Management**: Stripe / Paddle Integration
- **Execution Queue**: BullMQ / RabbitMQ for test execution
- **CI/CD**: GitHub Actions, Jenkins
- **Security**: Role-Based Access Control (RBAC), Rate Limiting, Subscription-Based API Restrictions

## 3. Storage & Integrations
- **File Storage**: Supabase Storage / AWS S3
- **Logging & Monitoring**: Grafana, Kibana
- **Error Tracking**: Sentry, LogRocket
- **Version Control**: GitHub / GitLab
- **Notifications**: Slack, MS Teams
- **Testing Infrastructure**: Puppeteer, Cypress for E2E testing
- **Containerization & Deployment**: Docker, Kubernetes

## 4. Deployment Strategy
- **Frontend:** Hosted on Vercel (Preferred) / Netlify
- **Backend:** Supabase (Preferred) / AWS Lambda / Firebase Functions
- **Database:** Supabase (PostgreSQL) / Prisma ORM for DB Access
- **Infrastructure as Code:** Terraform / Pulumi

## 5. API Documentation
- **Documentation Tools**: Swagger / Postman Collections
- **API Standards**: OpenAPI 3.0 / GraphQL Schema
- **Updated Authentication Endpoints:**
  - `POST /api/auth/signup` → Supports Trial, Pro, and Enterprise plans via NextAuth.js & Supabase Auth.
  - `POST /api/auth/login` → Handles JWT authentication & OAuth authentication via Supabase.
  - `GET /api/auth/me` → Fetches user details, including `planType`, `tenantId`.
  - `POST /api/billing/checkout` → Handles Stripe/Paddle payments.
  - `GET /api/billing/status` → Returns user plan & subscription info.

---

