# **Backend Installation & Configuration Guide**

## **1️⃣ System Requirements**
### **Prerequisites**
Ensure you have the following installed:
- **Node.js (v18 or later)** → Backend API development
- **PostgreSQL** → Database for authentication & test execution
- **Supabase CLI** → Managing database & storage
- **Git** → Version control for test cases
- **Docker (Optional)** → Running services like Elasticsearch & Kibana in containers
- **Playwright & Appium** → Web & Mobile automation frameworks

```bash
# Install Node.js
sudo apt update && sudo apt install -y nodejs npm

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Supabase CLI
npm install -g supabase

# Install Git
sudo apt install -y git

# Install Docker & Docker Compose
sudo apt install -y docker.io docker-compose
```

---

## **2️⃣ Setup & Configuration**
### **2.1 Initialize Git for Version Control**
```bash
# Initialize Git repository
cd ~/automation-saas
git init

# Add remote repository
git remote add origin https://github.com/your-org/your-repo.git
```

### **2.2 Configure Supabase for Authentication & Storage**
```bash
# Login to Supabase
supabase login

# Initialize a new Supabase project
supabase init

# Start Supabase services locally
supabase start
```

Update **.env** file with Supabase credentials:
```ini
SUPABASE_URL=https://your-instance.supabase.co
SUPABASE_KEY=your-supabase-key
DATABASE_URL=postgresql://user:password@localhost:5432/test_db
```

### **2.3 Setup Authentication System**
```bash
npm install next-auth supabase-js jsonwebtoken bcrypt
```
Modify **prisma/schema.prisma**:
```prisma
model User {
  id       String  @id @default(uuid())
  email    String  @unique
  password String?
  role     String  @default("trial")
  tenants  Tenant[]
}
```
Run migration:
```bash
npx prisma migrate dev --name auth_setup
```

---

## **3️⃣ Install & Configure API Backend**
```bash
npm install express cors dotenv prisma @prisma/client
```
Create **server.js**:
```javascript
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```
Run the backend:
```bash
node server.js
```

---

## **4️⃣ Setup & Configure Elasticsearch & Kibana**
```bash
# Start Elasticsearch & Kibana using Docker
sudo docker-compose up -d
```
Create **docker-compose.yml**:
```yaml
version: '3.7'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.10.2
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"
  kibana:
    image: docker.elastic.co/kibana/kibana:7.10.2
    container_name: kibana
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

Test connection:
```bash
curl -X GET "http://localhost:9200/_cat/health?v"
```

Install Elasticsearch client for backend:
```bash
npm install @elastic/elasticsearch
```
Add logging function in **server.js**:
```javascript
const { Client } = require("@elastic/elasticsearch");
const elasticsearch = new Client({ node: process.env.ELASTICSEARCH_URL });
async function logExecution(executionId, logs) {
  await elasticsearch.index({
    index: "test_executions",
    body: { executionId, logs, timestamp: new Date().toISOString() }
  });
}
```

---

## **5️⃣ Setup Test Execution (Playwright & Appium)**
### **5.1 Install Dependencies**
```bash
npm install playwright appium
```
### **5.2 Setup Playwright for Web Automation**
```bash
npx playwright install
```
### **5.3 Execution API Endpoint**
```javascript
const { chromium } = require("playwright");
app.post("/api/execute/local", async (req, res) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("https://example.com");
  await browser.close();
  res.json({ status: "completed" });
});
```

---

## **6️⃣ Setup Storage & Reporting (Supabase)**
### **6.1 Configure Supabase Storage**
```javascript
const supabase = require("@supabase/supabase-js").createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
```
### **6.2 Store Execution Reports in Supabase**
```javascript
async function uploadReportToSupabase(filePath, executionId) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = `${executionId}_report.html`;
    const { data, error } = await supabase.storage.from("test-reports").upload(fileName, fileBuffer);
    if (error) throw error;
    return data.path;
}
```

---

## **7️⃣ Final Steps: Run Everything**
```bash
# Start authentication & API server
node server.js

# Start Supabase
supabase start

# Start Elasticsearch & Kibana
sudo docker-compose up -d
```

### **🎯 Now the system is fully set up and ready for frontend integration.** 🚀

