# **Automai Frontend PRD (Next.js + TypeScript)**

## **1. Overview**
### **1.1 Purpose**
This document defines the **frontend requirements** for the Automai SaaS platform, structured for a **Next.js (React) TypeScript implementation**. It includes a **detailed sidebar structure**, role-based UI behavior, global layout, and an outline of all necessary pages and components. Each section will have its own dedicated page description to ensure developers can build the app page by page and component by component.

### **1.2 Scope**
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

## **2. Global Layout Definition**
### **2.1 Layout Structure**
The global layout consists of:
1. **Header (Top Navigation, Global Search, Quick Actions, User Profile)**
2. **Collapsible Sidebar (Primary Navigation with Automai Branding)**
3. **Main Content Area (Dynamically Updates Based on Page)**
4. **Footer (Status Information, Legal Notices, Versioning)**
5. **Temporary Role Switcher (For Development & Testing Only)**

### **2.2 Page Routing Strategy (Next.js App Router)**
- **Public Pages**
  - `/` → **Landing Page** (Marketing, Signup, Pricing, with Header & Footer)
  - `/login` → **Login Page** (Auth & Password Recovery, with Header & Footer)
  - `/signup` → **Registration Page**
  - `/pricing` → **Plan Details & Subscription Options**
- **Protected Pages (Requires Auth & Role-Based Access, No Header/Footer)**
  - `/dashboard` → **Main Dashboard**
  - `/projects` → **List of Test Projects**
  - `/projects/[id]` → **Project Details (Tests, Reports, Settings)**
  - `/scripts` → **Test Script Editor & Management**
  - `/deployments` → **Scheduled Test Executions**
  - `/devices` → **Device & Environment Control**
  - `/reports` → **Test Reports & Analytics**
  - `/team` → **User Management & Collaboration**
  - `/settings` → **Account Settings & Integrations**
- **Admin-Only Pages**
  - `/admin` → **Global Tenant Management**
  - `/admin/billing` → **Subscription & Payment Management**

---

## **3. Sidebar Structure**
### **3.1 General Sidebar Behavior**
- The **sidebar is collapsible**, with three states:
  - **Expanded Mode:** Displays icons & labels.
  - **Collapsed Mode:** Shows only icons with tooltips.
  - **Hidden Mode:** In full-screen workflows, the sidebar auto-hides.
- Sidebar visibility is **role-dependent**:
  - Admins see all sections.
  - Testers & Viewers have a limited view.
  - Developers see script-related sections.
- The **"Automai" logo** is placed in the collapsible sidebar to save space in the main content area.

### **3.2 Sidebar Menu Items (Expanded Mode)**

| **Icon** | **Section** | **Description** | **Access Roles** |
|---------|------------|----------------|----------------|
| 🏠 | **Dashboard** | Overview of tests, metrics, and team activity. | **All roles** |
| ✍️ | **Test Development** | Write and manage test cases, suites, and plans. | **Admin, Developer, Tester** |
| 🚀 | **Deployment & Execution** | Run tests manually or via scheduling. | **Admin, Developer, Tester** |
| 🖥️ | **Device & Environment Control** | Manage & monitor test devices and environments. | **Admin, Developer, Tester** |
| 📊 | **Reports & Analytics** | View test results and error analysis. | **Admin, Tester, Viewer** |
| 🤝 | **Team & Collaboration** | Manage users, assign roles, and collaborate. | **Admin, Developer, Tester** |
| ⚙️ | **Settings & Integrations** | Configure projects, integrations, and notifications. | **Admin, Developer** |
| 🌟 | **Upgrade to Pro (Trial Only)** | Visible only in trial mode to encourage upgrades. | **Trial Users Only** |

### **3.3 Sidebar (Collapsed Mode)**
- **Only icons are displayed** to maximize workspace.
- Tooltips appear on hover to reveal section names.
- Users can expand/collapse manually via a toggle button.

---

## **4. Main Content Layout**
### **4.1 Structure**
Each main content page follows a **consistent UI pattern**:
1. **Title & Breadcrumb Navigation**
2. **Action Buttons (Role-Specific Actions)**
3. **Main Workspace Area** (Dynamic Based on Page Content)
4. **Contextual Action Panel (If Applicable)**

### **4.2 Role-Based UI Adjustments**
| **Role** | **Dashboard View** | **Sidebar Access** | **Main Content Restrictions** |
|---------|-----------------|----------------|---------------------|
| **Admin** | Full metrics & team activity | Full access | No restrictions |
| **Developer** | Active test cases & scripts | No access to team management | Cannot change user roles |
| **Tester** | Assigned test executions | No access to settings | Cannot edit deployment settings |
| **Viewer** | Reports only | Limited sections | Read-only mode |

---

## **5. Authentication & Multi-Language Support**
### **5.1 Authentication**
- **NextAuth.js or Custom JWT-Based Authentication**
- Supports **Google OAuth, GitHub Login, Standard Email/Password**
- **Role-Based Access Control (RBAC)** handled via JWT claims.
- Refresh token strategy for session persistence.

### **5.2 Multi-Language Support (i18n)**
- Uses **next-translate** or **next-i18next**
- Default Language: **English**
- Supports additional languages via JSON translation files.
- Language selection dropdown in settings.

---

## **6. Sidebar UI Components & States**
### **6.1 Sidebar States**
| **State** | **Description** |
|----------|--------------|
| **Expanded** | Full menu with labels and icons. |
| **Collapsed** | Icons only, with tooltips on hover. |
| **Hidden** | In full-screen mode, sidebar auto-hides. |

### **6.2 Sidebar UI Interactions**
- **Clicking a section** expands its submenu (if applicable).
- **Hovering over collapsed icons** reveals section names.
- **Sidebar remembers last state** (Expanded or Collapsed) per session.
- **Sections with dynamic content (e.g., projects, teams) show badges** with counts.

---

## **7. Next Steps**
✅ Define each **menu & sub-menu page in detail**.
✅ Begin **wireframing the UI** to visualize interactions.
✅ Implement **temporary role switcher for development testing**.
✅ Determine **theme customizations (dark mode, accessibility, branding, design tokens, etc.)**.

🚀 Ready for next steps! Let’s refine the **page-specific UI components next.**