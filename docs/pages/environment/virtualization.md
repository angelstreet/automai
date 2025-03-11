# Device Monitoring Feature Integration

## 1. Short Summary

The Device Monitoring feature provides centralized visibility and control over virtual machines (VMs) and Docker environments utilized by tenants within the Automai SaaS platform. Integrated seamlessly within the broader web application, it allows users to monitor device health, manage Docker containers, and execute remote commands securely through embedded web terminals.

## 2. Infrastructure Overview & Tech Stack

### Integrated Infrastructure

- **Virtual Machines (VMs):** Dedicated VM instances per tenant for execution.
- **Docker Containers:** Managed Docker environments within each VM.
- **Portainer:** Container management interface for Docker.
- **Custom Monitoring Backend:** Interfaces with Portainer, Docker APIs, and SSH for health monitoring and control.

### Existing Tech Stack Integration

- **Frontend:**

  - Next.js, React, TypeScript
  - Zustand (state management)
  - Tailwind CSS
  - Xterm.js (embedded terminals)

- **Backend:**
  - Node.js (Express) / FastAPI (Python)
  - PostgreSQL (Supabase)
  - SSH libraries (node-ssh, Paramiko)
  - Docker API & Portainer API
  - Elasticsearch & Kibana (logging and monitoring)

## 3. Workflow & UI Layout Integration

### Workflow Integration

1. **Dashboard Access:**

   - Users navigate via the existing dashboard menu to "Device Monitoring."
   - Visibility restricted based on tenant roles and permissions.

2. **Device Overview & Health Checks:**

   - List of tenant-specific VMs and Docker container statuses.
   - Real-time health indicators displayed (CPU, RAM usage, container status).

3. **Terminal & Remote Commands:**

   - Embedded terminal (Xterm.js) for secure, direct SSH or Docker CLI interactions.
   - Users execute commands, troubleshoot, or manage containers directly.

4. **Real-Time Logging & Monitoring:**
   - Logs collected and stored in Elasticsearch.
   - Integrated Kibana dashboards for detailed monitoring and analytics.

### UI Layout Integration

- **Dashboard Section:**

  - Integrate as a sidebar item under existing dashboard navigation.

- **Monitoring Page:**

  - Device list view with expandable details per VM.
  - Embedded Xterm.js terminals for each device.
  - Quick actions (restart container, view logs, check resource usage).

- **Analytics & Logs:**
  - Leverage existing Kibana and Supabase storage integration for real-time analytics.
