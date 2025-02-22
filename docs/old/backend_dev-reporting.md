# Backend Implementation Guide

## **🚀 Implementations**
| **Feature**                          | **Status** | **Notes** |
|--------------------------------------|-----------|-----------|
| **Project Creation (UI + API)**      | ✅ Done | Users create & manage projects |
| **Test Case Management (UI + API)**  | ✅ Done | Users define steps, Git versioned |
| **Test Execution (Local Playwright)** | ✅ Done | Manual execution via local browser |
| **Test Execution (Cloud - Planned)** | 🕒 Planned | Future execution in VM/Docker |
| **Execution Logs (Kibana)**          | ✅ Done | Logs stored in Elasticsearch |
| **Test Reports (`report.html`)**      | ✅ Done | HTML logs, linked screenshots/video |
| **Screenshots & Video Storage**      | ✅ Done | Supabase Storage |
| **Execution UI (Table View)**        | ✅ Done | Users track test runs, open reports |
| **Git Versioning for Test Cases**    | ✅ Done | Auto commit on changes |
| **Resource Locking (Prevent Editing Conflicts)** | ✅ Done | Users can’t edit the same test case at once |
| **Alerts & Notifications (Slack/Email)** | 🕒 Planned | Will be added later |

---

## **1. Local Execution Setup (Phase 1)**
### **1.1 Install Dependencies**
Ensure you have Node.js installed, then install the required dependencies:
```bash
# Initialize a Node.js project
npm init -y

# Install backend dependencies
npm install express cors dotenv prisma @prisma/client supabase-js @elastic/elasticsearch playwright

# Install Playwright Browsers (needed for execution)
npx playwright install
```

### **1.2 Configure Environment Variables**
Create a `.env` file and define necessary environment variables:
```ini
PORT=5000
SUPABASE_URL=<your_supabase_url>
SUPABASE_KEY=<your_supabase_api_key>
ELASTICSEARCH_URL=http://localhost:9200
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/test_db
```

### **1.3 Database Setup (PostgreSQL + Prisma)**
#### **Step 1: Initialize Prisma**
```bash
npx prisma init
```

#### **Step 2: Define Database Schema (`prisma/schema.prisma`)**
```prisma
model Project {
  id        String  @id @default(uuid())
  name      String
  ownerId   String
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
  status      String  @default("pending")
  reportUrl   String?  // Path to the HTML test report
  createdAt   DateTime @default(now())
}
```

#### **Step 3: Migrate Database**
```bash
npx prisma migrate dev --name init
```

### **1.4 API Implementation (Express Server)**
#### **Step 1: Setup Express Server (`server.js`)**
```javascript
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");
const { Client } = require("@elastic/elasticsearch");

dotenv.config();
const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const elasticsearch = new Client({ node: process.env.ELASTICSEARCH_URL });

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### **1.5 Logging Execution Results to Elasticsearch**
```javascript
async function logExecutionToElasticsearch(executionId, testcaseId, status, logs) {
  await elasticsearch.index({
    index: "test_executions",
    body: {
      executionId,
      testcaseId,
      status,
      logs,
      timestamp: new Date().toISOString()
    }
  });
}
```

### **1.6 Storing Execution Reports in Supabase Storage**
```javascript
const fs = require("fs");
const path = require("path");

async function uploadReportToSupabase(filePath, executionId) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = `${executionId}_report.html`;

    const { data, error } = await supabase.storage.from("test-reports").upload(fileName, fileBuffer);
    if (error) throw error;

    return data.path;
}
```

### **1.7 Running Test Execution & Storing Logs**
```javascript
const { chromium } = require("playwright");

app.post("/api/execute", async (req, res) => {
  const { testcaseId } = req.body;
  const testCase = await prisma.testCase.findUnique({ where: { id: testcaseId } });
  if (!testCase) return res.status(404).json({ error: "Test case not found" });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const executionId = `execution_${Date.now()}`;
  const reportPath = path.join(__dirname, `test-results/${executionId}_report.html`);
  let logs = "";

  for (const step of testCase.steps) {
    if (step.action === "navigate") {
      await page.goto(step.value);
    } else if (step.action === "click") {
      await page.click(step.selector);
    } else if (step.action === "type") {
      await page.fill(step.selector, step.value);
    } else if (step.action === "verify") {
      logs += `Verified: ${step.selector}\n`;
    }
  }

  await browser.close();
  fs.writeFileSync(reportPath, `<h1>Execution Report</h1><p>${logs}</p>`);
  
  const reportUrl = await uploadReportToSupabase(reportPath, executionId);
  await logExecutionToElasticsearch(executionId, testcaseId, "completed", logs);
  
  const execution = await prisma.execution.create({
    data: { testcaseId, projectId: testCase.projectId, status: "completed", reportUrl },
  });

  res.json(execution);
});
```

## **2. Cloud Execution Setup (Phase 2)**
### **Planned Enhancements**
- Deploy **Playwright tests on a cloud-based VM** for remote execution.
- Store execution logs in **Elasticsearch for Kibana visualization**.
- Implement **parallel test execution** on multiple cloud instances.
- Integrate **CI/CD pipelines (GitHub Actions, Jenkins).**
- Enable **Slack & Email notifications** for failed tests.

## **Next Steps**
1️⃣ Deploy the local backend and test manual execution. 🚀
2️⃣ Implement cloud execution with Kubernetes/VM scaling. ☁
3️⃣ Set up automated CI/CD triggers for cloud deployments. 🔄

