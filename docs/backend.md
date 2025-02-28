# Backend Architecture & API Updates

## 1. Overview

The backend handles **multi-tenant test execution**, including **authentication, project management, test execution, and reporting**.

- **Local & Cloud Execution**: Playwright for local runs, cloud execution planned.
- **Storage & Logs**: Supabase Storage (screenshots/videos/reports) & Elasticsearch/Kibana (logs).
- **API for Test Execution & Reporting.**
- **Real-time Terminal Access**: WebSocket-based SSH terminal for remote machine access.

## 2. Tech Stack

- **Framework:** Node.js (Express) or FastAPI (Python)
- **Database:** PostgreSQL (Supabase) with Prisma ORM
- **Authentication:** NextAuth.js (OAuth, Email, JWT) with Supabase Auth
- **Storage:** Supabase Storage / AWS S3 (For execution reports, screenshots, videos)
- **Logging:** Kibana & Elasticsearch (Execution Logs)
- **Execution Framework:** Playwright for test automation
- **Version Control:** Git for tracking test case changes
- **WebSockets:** ws library for real-time terminal access
- **SSH:** ssh2 library for secure shell connections

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
  - **Uses singleton WebSocketServer pattern for efficient connection handling.**
  - **Supports authentication, command execution, and terminal resizing.**
  - **Implements ping/pong for connection health monitoring.**
  - **Logs terminal sessions and commands to Elasticsearch.**
  - **Handles connection errors and provides user feedback.**
  - **Supports both SSH and mock terminal implementations.**

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
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function uploadReportToSupabase(filePath, executionId) {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = `${executionId}_report.html`;

  const { data, error } = await supabase.storage.from('test-reports').upload(fileName, fileBuffer);
  if (error) throw error;

  return data.path; // Return the URL of the stored report
}
```

## 6. WebSocket & SSH Implementation

```javascript
// Custom Server Implementation with WebSocket Support
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

// Initialize Next.js with custom server
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global WebSocketServer instance
let wss = null;

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url, true);

      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Initialize WebSocket server at startup
  wss = new WebSocketServer({ noServer: true });

  // Set up ping interval for WebSocket connections
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Handle upgrade requests directly in the HTTP server
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url);

    // Handle terminal WebSocket connections
    if (pathname.startsWith('/api/virtualization/machines/') && pathname.endsWith('/terminal')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Start listening
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server initialized and ready`);
  });
});

// SSH Connection Handler
async function handleSshConnection(clientSocket, connection) {
  const sshClient = new Client();

  sshClient.on('ready', () => {
    sshClient.shell((err, stream) => {
      if (err) {
        clientSocket.send(JSON.stringify({ error: err.message }));
        return;
      }

      // Pipe data between SSH stream and WebSocket
      stream.on('data', (data) => clientSocket.send(data));
      clientSocket.on('message', (message) => stream.write(message));

      // Handle terminal resize
      clientSocket.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'resize') {
            stream.setWindow(data.rows, data.cols, 0, 0);
          }
        } catch (e) {
          // Not a resize message, treat as terminal input
        }
      });
    });
  });

  // Connect to SSH server
  sshClient.connect({
    host: connection.ip,
    port: connection.port || 22,
    username: connection.username,
    password: connection.password,
  });
}
```

## 7. Deployment Strategy

- **Frontend:** Hosted on Vercel.
- **Backend:** Supabase (Preferred) or AWS Lambda / Firebase Functions.
- **Database:** Supabase (PostgreSQL) / Prisma ORM.
- **Infrastructure as Code:** Terraform / Pulumi.
- **WebSocket Support:**
  - Custom Next.js server implementation for WebSocket support
  - Package.json scripts configured for custom server in both development and production
  - WebSocket server initialized at startup for immediate availability
  - Direct handling of upgrade requests in the HTTP server
  - Deployment environment must support long-lived connections

---

This backend update ensures **structured test execution, reporting, and integration with Supabase Storage, Kibana, and Git.** The WebSocket implementation provides real-time terminal access with proper connection management and error handling. 🚀
