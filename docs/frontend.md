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

## 2. Global Layout Definition
### 2.1 Layout Structure
The global layout consists of:
1. **Header (Top Navigation, Global Search, Quick Actions, User Profile)**
2. **Collapsible Sidebar (Primary Navigation with Automai Branding)**
3. **Main Content Area (Dynamically Updates Based on Page)**
4. **Footer (Status Information, Legal Notices, Versioning)**
5. **Temporary Role Switcher (For Development & Testing Only)**

### 2.2 Page Routing Strategy (Next.js App Router)
- **Public Pages**
  - `/` → Landing Page (Marketing, Signup, Pricing, with Header & Footer)
  - `/login` → Login Page (Auth & Password Recovery, with Header & Footer)
  - `/signup` → Registration Page
  - `/pricing` → Plan Details & Subscription Options
- **Protected Pages (Requires Auth & Role-Based Access, No Header/Footer)**
  - `/dashboard` → Main Dashboard
  - `/projects` → List of Test Projects
  - `/projects/[id]` → Project Details (Tests, Reports, Settings)
  - `/scripts` → Test Script Editor & Management
  - `/deployments` → Scheduled Test Executions
  - `/devices` → Device & Environment Control
  - `/reports` → Test Reports & Analytics
  - `/team` → User Management & Collaboration
  - `/settings` → Account Settings & Integrations
- **Admin-Only Pages**
  - `/admin` → Global Tenant Management
  - `/admin/billing` → Subscription & Payment Management

---

## 3. Sidebar & Navigation Structure
### Sidebar States
- **Expanded (240px width):** Full menu with icons + labels
- **Collapsed (64px width):** Icons only with tooltips
- **Hidden (0px width):** Used in full-screen workflows

### Sidebar Menu Structure
| **Section**               | **Subsections**                | **Access Roles** |
|--------------------------|-------------------------------|-----------------|
| **🏠 Dashboard**         | no subsections           | All Roles       |
| **✍️  Development** | Project, Use Case, Campaign | Admin, Dev |
| **🚀 Execution** | Schedule, Deployment Table | Admin, Dev, QA  |
| **🖥️ Devices** | Web, Mobile | Admin, Dev, QA  |
| **📊 Reports** | Results, Performance  | Admin, Dev, QA, Viewer |
| **⚙️ Settings** | Team, Configuration,Integration  | Admin, Dev      |

---

## 4. UI Layout
### Header
- **Height:** 48px
- **Components:** 
  - Tenant Logo (32px height max)
  - Global Search Bar (Expandable)
  - Right Section:
    - Theme Toggle (Light/Dark Mode)
    - User Profile Dropdown (Avatar, Settings, Logout)

### Workspace Grid Structure
```
+----------------+------------------+
|     Header     |  Theme/Profile  |
+----------------+------------------+
|   Breadcrumb (collapsible)       |
+----------------+------------------+
|                |                 |
|    Sidebar     |   Main Content  |
|                |                 |
|                |                 |
+----------------+------------------+
```

---

## 5. Role-Based UI & Multi-Tenancy Support
- **Multi-Tenancy Support:** Role-based access and isolated workspaces per tenant.
- **Dynamic UI Based on Role Permissions:**
  - **Admin:** Full access, manages users, settings, and reports.
  - **Developer:** Can edit test scripts, manage deployments, and view reports.
  - **Tester:** Executes tests, views reports, but cannot modify configurations.
  - **Viewer:** Read-only access to reports and dashboard.
- **Temporary Role Switcher** (for testing different roles in development mode).

## 6. Multi-Language Support (i18n)
- Uses **next-translate** or **next-i18next**.
- Default Language: **English**.
- Supports additional languages via JSON translation files.
- Language selection dropdown in settings.

---

This document ensures a **consistent frontend implementation** for Automai, integrating **UI/UX best practices, multi-tenancy support, role-based UI behavior, sidebar navigation, and page structure**.
