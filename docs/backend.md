# Backend Architecture & API Updates

## 1. Overview
The backend handles **multi-tenant test execution**, including **authentication, project management, test execution, and reporting**. 
- **Local & Cloud Execution**: Playwright for local runs, cloud execution planned.
- **Storage & Logs**: Supabase Storage (screenshots/videos/reports) & Elasticsearch/Kibana (logs).
- **API for Test Execution & Reporting.**

## 2. Tech Stack
- **Framework:** Node.js (Express) or FastAPI (Python)
- **Database:** PostgreSQL (Supabase) with Prisma ORM
- **Authentication:** NextAuth.js (OAuth, Email, JWT) with Supabase Auth
- **Storage:** Supabase Storage / AWS S3 (For execution reports, screenshots, videos)
- **Logging:** Kibana & Elasticsearch (Execution Logs)
- **Execution Framework:** Playwright for test automation
- **Version Control:** Git for tracking test case changes

## 3. API Structure
### 3.1 Project Management
- **Create a Project** → `POST /api/projects`
- **Get All Projects** → `GET /api/projects`
- **Delete a Project** → `DELETE /api/projects/:id`

### 3.2 Test Case Management
- **Create a Test Case** → `POST /api/testcases`
- **Get Test Cases** → `GET /api/testcases?project_id=...`
- **Lock a Test Case (Avoid Concurrent Editing)** → `POST /api/testcases/:id/lock`
- **Unlock a Test Case** → `POST /api/testcases/:id/unlock`

### 3.3 Test Execution (Local & Cloud)
- **Run a Test Locally** → `POST /api/execute`
  - **Uses Playwright to execute test steps in local browser.**
  - **Generates structured HTML report (report.html).**
  - **Saves report.html, logs, screenshots, and videos in Supabase Storage.**
  - **Pushes logs to Elasticsearch for Kibana reporting.**
- **Run Test in Cloud (Planned)** → `POST /api/cloud-execute`
  - **Deploys execution to a managed VM (Future).**

### 3.4 SSH Terminal Access
- **Connect to SSH Terminal** → `GET /api/virtualization/machines/[id]/terminal`
  - **WebSocket endpoint for real-time SSH terminal access.**
  - **Supports authentication, command execution, and terminal resizing.**
  - **Logs terminal sessions and commands to Elasticsearch.**
  - **Handles connection errors and provides user feedback.**

### 3.5 Execution Reporting & Logs
- **Get Execution Logs** → `GET /api/executions?testcase_id=...`
  - **Returns execution logs from PostgreSQL & Kibana.**
  - **Provides `report.html` link from Supabase Storage.**
- **Fetch Kibana Report** → `GET /api/reports?execution_id=...`

### 3.6 Git Versioning
- **Sync Test Case to Git** → Saves test case JSON in repo.
- **Auto-commit changes & push** → Git commit & push after edits.

## 4. Database Schema (PostgreSQL + Prisma)
```prisma
model Project {
  id        String  @id @default(uuid())
  name      String
  ownerId   String  @relation(fields: [ownerId], references: [id])
  createdAt DateTime @default(now())
  testcases TestCase[]
}

model TestCase {
  id        String  @id @default(uuid())
  projectId String  @relation(fields: [projectId], references: [id])
  name      String
  steps     Json
  lockedBy  String?
  createdAt DateTime @default(now())
  executions Execution[]
}

model Execution {
  id          String  @id @default(uuid())
  testcaseId  String  @relation(fields: [testcaseId], references: [id])
  projectId   String  @relation(fields: [projectId], references: [id])
  status      String  @default("pending") // running, completed, failed
  reportUrl   String?  // Path to the HTML test report
  createdAt   DateTime @default(now())
}
```

## 5. Storage Strategy
### Local Execution
- **HTML report (`report.html`) stored in `/test-results/project_usecaseid_run_YYYYMMDD_HHMMSS/`**
- **Screenshots & videos stored locally.**
- **Execution logs saved locally, then pushed to Kibana.**

### Cloud Execution (Planned)
- **HTML report (`report.html`) uploaded to Supabase Storage.**
- **Screenshots/Videos uploaded to Supabase Storage or AWS S3.**
- **Execution logs sent to Kibana.**

### Uploading Reports to Supabase
```javascript
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function uploadReportToSupabase(filePath, executionId) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = `${executionId}_report.html`;

    const { data, error } = await supabase.storage.from("test-reports").upload(fileName, fileBuffer);
    if (error) throw error;

    return data.path;  // Return the URL of the stored report
}
```

## 6. SSH Implementation
```javascript
const { Client } = require('ssh2');

async function createSSHTerminal(connection, socket) {
  const sshClient = new Client();
  
  sshClient.on('ready', () => {
    sshClient.shell((err, stream) => {
      if (err) {
        socket.send(JSON.stringify({ error: err.message }));
        return;
      }
      
      // Pipe data between SSH stream and WebSocket
      stream.on('data', (data) => socket.send(data));
      socket.on('message', (message) => stream.write(message));
      
      // Handle terminal resize
      socket.on('resize', ({ rows, cols }) => {
        stream.setWindow(rows, cols, 0, 0);
      });
    });
  });
  
  // Connect to SSH server
  sshClient.connect({
    host: connection.ip,
    port: connection.port || 22,
    username: connection.username,
    password: connection.password
  });
}
```

## 7. Deployment Strategy
- **Frontend:** Hosted on Vercel.
- **Backend:** Supabase (Preferred) or AWS Lambda / Firebase Functions.
- **Database:** Supabase (PostgreSQL) / Prisma ORM.
- **Infrastructure as Code:** Terraform / Pulumi.

---
This backend update ensures **structured test execution, reporting, and integration with Supabase Storage, Kibana, and Git.** 🚀

