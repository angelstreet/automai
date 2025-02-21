# Frontend Guidelines

## 1. Overview
### 1.1 Purpose
This document defines the **frontend requirements** for the Automai SaaS platform, structured for a **Next.js (React) TypeScript implementation**. It includes a **detailed sidebar structure**, role-based UI behavior, global layout, and an outline of all necessary pages and components. Each section will have its own dedicated page description to ensure developers can build the app page by page and component by component.

### 1.2 Scope
- **Platform:** Web-based SaaS UI (Next.js + TypeScript + Tailwind CSS)
- **Multi-Language Support:** i18n (Internationalization) with JSON-based translations
- **Multi-Tenancy Support:** Role-based access and isolated workspaces
- **Routing Strategy:** Next.js App Router with Layout Components
- **Authentication:** JWT-based Auth (NextAuth.js or Custom)
- **State Management:** React Context or Zustand
- **Dynamic UI Based on Role Permissions**
- **Collapsible Sidebar & Adaptive Layout**
- **Role Switcher for Development:** Temporary role switcher for testing UI across different roles

---

## 2. Authentication Flow & Subscription-Based Access
- User clicks **Sign Up/Login**.
- Enters **email/password or uses OAuth** (Google/GitHub).
- **Selects Plan:** Trial, Pro, or Enterprise.
- Redirected to **dashboard** upon successful authentication.
- **Feature Restrictions Based on Plan:**
  - **Trial:** Can only create **1 project, 5 use cases, 1 campaign**.
  - **Pro:** Unlimited projects but **no team management**.
  - **Enterprise:** Full access with **team and admin features**.

**API Calls:**
- `POST /api/auth/signup` → Handles user authentication & plan selection.
- `POST /api/billing/checkout` → Redirects Pro/Enterprise users to payment.
- `GET /api/tenants` → Fetches assigned workspace.

---

## 3. Global Layout Definition
### 3.1 Layout Structure
The global layout consists of:
1. **Header (Top Navigation, Global Search, Quick Actions, User Profile)**
2. **Collapsible Sidebar (Primary Navigation with Automai Branding)**
3. **Main Content Area (Dynamically Updates Based on Page)**
4. **Footer (Status Information, Legal Notices, Versioning)**
5. **Temporary Role Switcher (For Development & Testing Only)**

### 3.2 Sidebar & Navigation Updates
- Modify sidebar **dynamically based on user plan**:
  - **Trial Users:** Hide Billing & Team Management.
  - **Pro Users:** Hide Team Management.
  - **Enterprise Users:** Full access.
- **Sidebar Menu Structure**
| **Section**               | **Subsections**                | **Access Roles** |
|--------------------------|-------------------------------|-----------------|
| **🏠 Dashboard**         | no subsections           | All Roles       |
| **✍️  Development** | Project, Use Case, Campaign | Trial, Pro, Enterprise |
| **🚀 Execution** | Schedule, Deployment Table | Pro, Enterprise  |
| **📊 Reports** | Results, Performance  | Pro, Enterprise |
| **⚙️ Settings** | Team, Configuration, Integration | Enterprise only  |
| **💳 Billing** | Subscription Management | Pro, Enterprise |

---

## 4. Subscription Plan UI & Billing
### 4.1 UI Changes
- **Signup Page** (`/signup`):
  - Users select **Trial, Pro, or Enterprise** during signup.
- **Dashboard Upgrade CTA:**
  - **Trial Users** see an **Upgrade to Pro/Enterprise** button.
- **Billing Page (`/admin/billing`)**
  - **For Pro & Enterprise only**.
  - Shows **current plan & upgrade options**.

**API Calls:**
- `GET /api/billing/status` → Fetch user subscription.
- `POST /api/billing/checkout` → Redirects users to payment.

---

## 5. Role-Based UI & Feature Restrictions
- **Trial Users:** Limited to 1 project, 5 use cases, 1 campaign.
- **Pro Users:** No team management.
- **Enterprise Users:** Full access.
- **Dynamic UI Based on Role Permissions:**
  - Hide **Team & Billing for Trial**.
  - Show **Billing but hide Team for Pro**.
  - Show **Everything for Enterprise**.

**API Calls:**
- `GET /api/users/me` → Fetch role & plan type.
- `GET /api/tenants` → Check multi-tenant access.

---

## 6. Multi-Language Support (i18n)
- Uses **next-translate** or **next-i18next**.
- Default Language: **English**.
- Supports additional languages via JSON translation files.
- Language selection dropdown in settings.

---

This document ensures a **consistent frontend implementation** for Automai, integrating **UI/UX best practices, multi-tenancy support, subscription-based feature restrictions, dynamic navigation, and API integration.**
