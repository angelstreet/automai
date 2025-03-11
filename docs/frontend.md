# Frontend Architecture & UI Components

## 1. Overview

The frontend is built with **Next.js + TypeScript**, designed to handle:

- **Project & Test Case Management** (CRUD Operations, Git Versioning).
- **Test Execution UI** (Live Execution Table, Logs, Screenshots, Videos via Report HTML).
- **Integration with Kibana for Deep Reporting.**
- **Authentication & Multi-Tenant Support.**

## 2. Tech Stack

- **Framework:** Next.js (React) + TypeScript
- **State Management:** Zustand / React Context
- **Styling:** Tailwind CSS, shadcn-ui
- **Authentication:** NextAuth.js (JWT, OAuth via Supabase)
- **Storage:** Supabase Storage (For HTML Reports, Screenshots & Videos)
- **API Integration:** Fetching execution logs & Kibana links
- **Testing UI:** Playwright integration for test execution visualization

## 3. UI Components & Pages

### **3.1 Sidebar Navigation**

| **Section**        | **Subsections**                  | **Access Roles**       |
| ------------------ | -------------------------------- | ---------------------- |
| **🏠 Dashboard**   | Overview of project executions   | All Roles              |
| **✍️ Development** | Project, Use Case, Campaign      | Trial, Pro, Enterprise |
| **🚀 Execution**   | Schedule, Deployment Table       | Pro, Enterprise        |
| **📊 Reports**     | Results, Performance             | Pro, Enterprise        |
| **⚙️ Settings**    | Team, Configuration, Integration | Enterprise only        |
| **💳 Billing**     | Subscription Management          | Pro, Enterprise        |

### **3.2 Project & Test Case Management**

- **Page:** `/projects`
- **Features:**
  - Create, edit, and delete projects.
  - View all test cases within a project.
  - **Git versioning:** Track changes and revert if needed.
  - **Locking system:** Prevents multiple users from editing the same test case.

### **3.3 Execution UI (Live Test Execution Tracking)**

- **Page:** `/executions`
- **Features:**
  - **Execution Table:**
    - Lists all running & completed test executions.
    - Displays status (Running, Success, Failed).
    - **Links to execution report (report.html stored in Supabase).**
    - Provides quick filters (project, user, date range, execution ID).
  - **Integration with Kibana:**
    - Direct links to logs stored in **Elasticsearch/Kibana**.
    - Filters by execution timestamp.
  - **Action Buttons:**
    - **View Report:** Opens `report.html` from Supabase Storage.
    - **Re-run Test (Optional):** Trigger a retry for failed test cases.

### **3.4 Reports & Analytics**

- **Page:** `/reports`
- **Features:**
  - **Filters for test execution history** (status, project, user, timeframe).
  - **Performance metrics:** Average execution time, pass/fail rate.
  - **Visualizations (Planned):** Graphs & charts for execution insights.
  - **Export to CSV/PDF.**
  - **Direct Open Report Button:**
    - Links to `report.html` for each test execution.

## 4. API Calls & Data Fetching

### **Fetching Executions**

```javascript
const fetchExecutions = async () => {
  const res = await fetch('/api/executions');
  return await res.json();
};
```

### **Fetching Report HTML Link for an Execution**

```javascript
const fetchExecutionDetails = async (executionId) => {
  const res = await fetch(`/api/executions/${executionId}`);
  return await res.json();
};
```

### **Displaying Execution Table with Report Link**

```jsx
<Table>
  <thead>
    <tr>
      <th>Execution ID</th>
      <th>Status</th>
      <th>Duration</th>
      <th>Report</th>
    </tr>
  </thead>
  <tbody>
    {executions.map((exec) => (
      <tr key={exec.id}>
        <td>{exec.id}</td>
        <td>{exec.status}</td>
        <td>{exec.duration} sec</td>
        <td>
          <a href={exec.reportUrl} target="_blank">
            View Report
          </a>
        </td>
      </tr>
    ))}
  </tbody>
</Table>
```

## 5. Future Enhancements

- **CI/CD Integration (Trigger test runs from GitHub/GitLab).**
- **Real-time execution updates (WebSockets for instant status updates).**
- **Dark mode UI & better analytics visualizations.**
- **Slack/MS Teams alerting for failed test cases.**

---

This frontend update ensures **seamless test management, execution tracking, and integration with Kibana & Supabase Storage.** 🚀
