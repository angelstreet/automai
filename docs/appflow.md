# AppFlow: User Journey (Plain Text)

## 1. Landing Page
- User visits the **landing page**.
- Can view **product overview, pricing, and features**.
- Option to **sign up or log in**.

## 2. Authentication Flow
- User clicks **Sign Up/Login**.
- Enters **email/password or uses OAuth** (Google/GitHub).
- Redirected to **dashboard** upon successful authentication.

## 3. Dashboard Navigation
- User lands on the **main dashboard**.
- Sees **recent test executions, project statuses, and quick actions**.
- Sidebar provides access to:
  - **Test Development**
  - **Execution & Scheduling**
  - **Reports & Analytics**
  - **Team Management**
  - **Settings**

## 4. Multi-Tenant Workspace Selection
- If user belongs to **multiple tenants**, they must select a **workspace**.
- Each tenant has **isolated data, users, and configurations**.
- Workspace switcher is available in the **header**.
- Example URL structure: `http://localhost:3000/en/tenant1/dashboard`

## 5. Test Development
- User navigates to **Test Development**.
- Creates a **new test script**.
- Uses the **built-in editor** for modifications.
- Saves and commits changes.

## 6. Execution & Scheduling
- User selects **test cases** for execution.
- Chooses **environment & device settings**.
- Can run **immediately** or **schedule for later**.
- Receives **execution logs and results**.

## 7. Reports & Analytics
- User navigates to **Reports & Analytics**.
- Views **test results, pass/fail trends, error logs**.
- Exports reports in **CSV/PDF format**.
- Can set up **alerts & notifications**.

## 8. Team & Collaboration
- Admin manages **team roles & permissions**.
- Assigns **developers/testers/viewers**.
- Users receive **in-app and email notifications**.
- Collaboration tools available: **comments, task assignments**.

## 9. Settings & Integrations
- User accesses **Settings**.
- Configures **API integrations** (GitHub, Slack, CI/CD tools).
- Updates **profile & preferences**.
- Manages **billing & subscription** (if applicable).

## 10. Subscription Plans & Limitations
### 10.1 Trial Plan
- **Users:** Individual developers exploring the platform.
- **Limitations:**
  - **1 Project Only**
  - **Max 5 Use Cases**
  - **1 Campaign**
  - **Only 1 Web Environment Execution**
  - **No Team Management**
- **Upgrade Path:** Redirect to `/pricing` when limits are reached.

### 10.2 Pro Plan
- **Users:** Individual developers who need full platform access.
- **Features:**
  - **Unlimited Projects, Use Cases, and Campaigns**
  - **Supports Multiple Environments (Web, Mobile, Cloud)**
  - **No Team Management (Single User Only)**
  - **Access to Advanced Reports & Integrations**
- **Upgrade Path:** Users can upgrade from trial or sign up directly.

### 10.3 Enterprise Plan
- **Users:** Companies needing team collaboration.
- **Features:**
  - **Everything in Pro + Team Management**
  - **Admin Panel & Billing Management**
  - **Integration Support (Jira, Slack, CI/CD)**
  - **Multi-Tenant Workspaces**
- **Signup:** Users can upgrade from Pro or sign up directly.

### 10.4 Billing & Payment Integration
- **Stripe / Paddle Integration for Payments**
- **API Endpoints for Subscription Management:**
  - `POST /api/billing/checkout` → Initiates payment.
  - `GET /api/billing/status` → Checks user plan.
  - `POST /api/tenants` → Auto-create tenant on Pro/Enterprise signup.

## 11. Navigation Logic
- **Default route:** `/dashboard` after login.
- **Public pages:** Landing page, pricing, documentation.
- **Tenant-aware routing:** Users are redirected based on workspace selection.
- **Direct menu access:** Allowed for authenticated users.

## 12. Logout
- User logs out from the app.
- Redirected back to **landing page**.

---

This document provides a **plain-text user journey** ensuring **AI-driven development alignment**, including **multi-tenancy support, navigation logic, and workspace selection.**