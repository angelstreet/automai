# AppFlow: User Journey (Updated for Test Execution & Reporting)

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

## 5. Test Development (Project & Use Case Creation)
### **Example Flow: Creating a Project & Test Case**
#### **Step 1: Create a Project**
- User navigates to **Test Development** → `Projects`.
- Clicks **Create Project**.
- Enters project details (Name, Description).
- Saves and sees the project listed.

#### **Step 2: Create a Test Case**
- Inside a project, user clicks **Add Test Case**.
- Defines:
  - **Test Name**
  - **Test Steps** (Navigate, Click, Type, Verify, etc.).
- Saves and **version is tracked in Git**.
- **Test Case Locking:** Prevents multiple users from editing the same test case.
- **Test Case is stored in PostgreSQL and Git.**

## 6. Execution & Scheduling
### **Example Flow: Running a Test (Manual & Deployed)**
#### **Step 1: Run Test Manually (Local Execution)**
- User navigates to **Execution → Deployment Table**.
- Selects a test case and clicks **Run Locally**.
- **Playwright executes the test in the browser.**
- **Logs, screenshots, and video are captured.**
- **An HTML report (`report.html`) is generated.**
- **Report is uploaded to Supabase Storage.**
- Execution record is stored in PostgreSQL with `reportUrl`.
- User can open `report.html` from **Kibana or in-app Execution UI**.

#### **Step 2: Run Test on Deployed VM (Cloud Execution - Planned)**
- User selects **Deploy Test** instead of manual execution.
- System provisions a **VM/Dockerized instance** for execution.
- **Playwright runs in headless mode on the remote VM.**
- **Logs, screenshots, and video are captured & stored in Supabase.**
- **Execution logs sent to Kibana for real-time tracking.**
- User accesses `report.html` via execution table.

## 7. Reports & Analytics
### **Example Flow: Viewing Test Execution Reports**
- User navigates to **Reports → Results**.
- **Filters executions by Project, Test Case, Date, Status.**
- Sees:
  - **Test Execution Status (Running, Passed, Failed).**
  - **Execution Time & Logs (via Kibana).**
  - **View Report Button → Opens `report.html`.**
  - **Screenshots & Video linked in the report.**
- **Exports execution summary to CSV/PDF.**

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

This document provides a **structured user journey**, integrating **project creation, test execution, reporting via `report.html`, local & cloud execution, Kibana insights, and Supabase storage.** 🚀

