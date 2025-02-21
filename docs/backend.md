# Backend Structure

## 1. Overview
The Automai SaaS platform backend is designed to handle **multi-tenant test automation**, providing secure authentication, API integrations, role-based access, and scalable execution management.

## 2. Tech Stack
- **Framework:** Node.js (Express) or FastAPI (Python)
- **Database:** PostgreSQL (Supabase) or MongoDB (Prisma ORM)
- **Authentication:** JWT (NextAuth.js for OAuth support)
- **Subscription Management:** Stripe / Paddle Integration
- **Storage:** Supabase Storage / AWS S3
- **Queue System:** BullMQ / RabbitMQ for test execution scheduling
- **CI/CD:** GitHub Actions / Jenkins
- **Logging & Monitoring:** Grafana / Kibana
- **Containerization:** Docker + Kubernetes (Optional for Scaling)

## 3. API Structure
### 3.1 Authentication API (Updated for Plan-Based Access)
- **`POST /api/auth/login`** → User authentication with plan verification.
- **`POST /api/auth/signup`** → User registration with plan selection (**Trial, Pro, Enterprise**).
- **`POST /api/auth/logout`** → Session termination.
- **`GET /api/auth/me`** → Get current user details, including `planType`.
- **OAuth Support:** Google, GitHub authentication.

### 3.2 Subscription & Billing API
- **`POST /api/billing/checkout`** → Redirects users to Stripe/Paddle for payment.
- **`GET /api/billing/status`** → Fetches user plan & payment status.
- **`POST /api/tenants`** → Auto-create tenant on Pro/Enterprise signup.
- **`PATCH /api/users/:id`** → Upgrade user plan.

### 3.3 Tenant & User Management
- **`GET /api/tenants`** → List available tenants.
- **`POST /api/tenants`** → Create a new tenant.
- **`GET /api/tenants/:id`** → Get tenant details & enforce **plan-based feature access**.
- **`POST /api/users`** → Invite a new user (Enterprise only, blocked for Pro users).

### 3.4 Feature-Based Access Restrictions
- **`POST /api/projects`** →
  - **Trial:** Max 1 project.
  - **Pro & Enterprise:** Unlimited projects.
- **`POST /api/users`** →
  - **Enterprise only:** Can invite team members.
  - **Pro:** Team management disabled.

### 3.5 Database Schema Adjustments
#### Tables
- **Users** (`id`, `email`, `role`, `tenant_id`, `planType`, `created_at`)
- **Tenants** (`id`, `name`, `created_at`)
- **Billing** (`id`, `user_id`, `planType`, `status`, `created_at`)

### 3.6 Multi-Tenancy & Role-Based Access Control (RBAC)
- **Row-Level Security:** Ensures data isolation.
- **Scoped API Access:** Enforces user restrictions based on `planType`.
- **Rate Limiting:** Trial users have API request restrictions.

## 4. Deployment Strategy
- **Frontend:** Hosted on Vercel.
- **Backend:** Supabase (Preferred) or AWS Lambda / Firebase Functions.
- **Database:** Supabase (PostgreSQL) / AWS RDS.
- **Infrastructure as Code:** Terraform / Pulumi.

---