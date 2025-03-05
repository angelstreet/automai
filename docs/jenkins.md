# Jenkins Multi-Tenant Architecture: Centralized & Decentralized Setup

## Overview
This document provides a detailed guide on setting up **Jenkins for multi-tenancy**, covering:
- **Centralized and Decentralized Jenkins Approaches**
- **Multi-Tenant Configuration**
- **Installation and Setup on macOS**
- **Connecting to Remote Runners**
- **Integrating with a Prisma SQL Database & Next.js Project**

---

# 1️⃣ Multi-Tenant Jenkins Architecture

## **1. Centralized Multi-Tenant Jenkins** (Shared Jenkins Instance)
✅ **For tenants who don’t need full isolation** but require shared CI/CD pipelines.

- **Single Jenkins Master** instance.
- Uses **Folders & RBAC (Role-Based Access Control)** to isolate tenants.
- **Dedicated agents per tenant** to prevent resource conflicts.
- **Scoped credentials** to restrict access per tenant.
- **Lower cost & easy maintenance**.

### **How to Set It Up?**
1. **Install Role-Based Authorization Strategy Plugin**
2. **Create a folder for each tenant** (e.g., `Tenant-1-NextJS`)
3. **Define roles (Admin, Developer, Tester, Viewer)**
4. **Assign users and restrict access per folder**
5. **Use labels to assign dedicated agents to specific tenants**

---

## **2. Decentralized Jenkins (Dedicated Jenkins Per Tenant)**
✅ **For tenants requiring full isolation or custom configurations**

- Each tenant gets **a dedicated Jenkins instance** (self-hosted or cloud-based).
- Each instance runs **on-premise, in Docker, or Kubernetes**.
- **Tenant-specific agents (VM, Docker, Kubernetes)**.
- **Higher cost but full control over configurations & security**.

### **How to Set It Up?**
1. **Use Infrastructure as Code (IaC)** tools (Terraform, Ansible) to spin up Jenkins instances.
2. **Configure JCasC (Jenkins Configuration as Code) for automation**.
3. **Monitor multiple Jenkins instances centrally using Prometheus & Grafana**.
4. **Use a Jenkins Federation Layer (Jenkins Operations Center or CloudBees)**.

---

## **3. Hybrid Model: Centralized + Decentralized Jenkins**
✅ **Best of both worlds**

- **Small tenants share a centralized Jenkins**.
- **Large enterprises have dedicated Jenkins instances**.
- **Common monitoring and logging using Prometheus, ELK, or Grafana**.
- **Unified RBAC policy across instances**.

---

# 2️⃣ Installation: Setting Up Centralized Jenkins on macOS

### **Step 1: Install Jenkins on Mac**
```sh
brew install jenkins-lts
brew services start jenkins-lts
```

Check if Jenkins is running:
```sh
jenkins --version
```

Visit **http://localhost:8080** to unlock Jenkins.

Retrieve the initial password:
```sh
cat /Users/$(whoami)/.jenkins/secrets/initialAdminPassword
```

---

### **Step 2: Install Essential Plugins**
✅ **Folders Plugin** (for tenant isolation)  
✅ **Role-Based Authorization Strategy Plugin** (RBAC)  
✅ **Pipeline Plugin** (for CI/CD workflows)  
✅ **SSH Pipeline Steps Plugin** (for remote execution)  
✅ **Git Plugin** (for GitHub/GitLab/Gitea integration)  
✅ **PostgreSQL Plugin** (for Prisma database integration)  
✅ **Docker Plugin** (for containerized runners)

---

### **Step 3: Set Up Prisma SQL Database**
1. Install PostgreSQL:
```sh
brew install postgresql
brew services start postgresql
```
2. Create a Prisma database:
```sh
createdb prisma_db
```
3. Add the connection string to Next.js `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/prisma_db"
```
4. Run Prisma migrations:
```sh
npx prisma migrate dev
```

---

# 3️⃣ Connecting Jenkins to Remote Runners

## **1. Configure Remote SSH Agents**
1. On the remote server, run:
```sh
java -jar agent.jar -jnlpUrl http://your-jenkins-url/computer/remote-agent/slave-agent.jnlp -secret your-secret-key -workDir "/home/jenkins"
```
2. In Jenkins: **Manage Jenkins → Nodes and Clouds → New Node**.
3. Assign a **label** (`remote-runner`) and configure **SSH connection**.


## **2. Use Dockerized Jenkins Agents**
Run a Jenkins agent container on the remote host:
```sh
docker run -d --rm --name jenkins-agent -v /var/run/docker.sock:/var/run/docker.sock jenkins/inbound-agent
```

In Jenkins, connect to the remote agent via **SSH** and assign it to a tenant folder.

---

# 4️⃣ Jenkins Pipeline for Next.js & Prisma Deployment

### **Step 1: Add Jenkins Credentials for GitHub/GitLab**
1. Go to **Manage Jenkins → Credentials → System**
2. Add **SSH Username with Private Key**
3. Use this ID in your pipeline script.

### **Step 2: Create a Jenkinsfile**
```groovy
pipeline {
  agent any
  stages {
    stage('Checkout Code') {
      steps {
        git branch: 'main', credentialsId: 'your-ssh-key-id', url: 'git@github.com:your-repo.git'
      }
    }
    stage('Install Dependencies') {
      steps {
        sh 'npm install'
      }
    }
    stage('Build Next.js') {
      steps {
        sh 'npm run build'
      }
    }
    stage('Deploy') {
      steps {
        sshagent(['your-ssh-key-id']) {
          sh 'scp -r .next/ user@remote-host:/var/www/nextjs-app'
          sh 'ssh user@remote-host "pm2 restart nextjs-app"'
        }
      }
    }
  }
}
```

---

# 5️⃣ Monitoring & Reporting
✅ **For Job Logs** → Check **Build Console Output** in Jenkins.
✅ **For Prisma DB Logs** → Use `pgAdmin` or `psql` CLI.
✅ **For Remote Host Logs** → Use SSH:
```sh
ssh user@remote-host tail -f /var/log/jenkins.log
```
✅ **For Centralized Monitoring** → Use **Prometheus + Grafana**.

---

# 🚀 Final Architecture
### **Hybrid Multi-Tenant Jenkins Setup**
1️⃣ **Centralized Jenkins Master** for shared tenants.  
2️⃣ **Dedicated Jenkins Instances** for high-security tenants.  
3️⃣ **Remote Agents on VMs, Docker, Kubernetes**.  
4️⃣ **Monitoring with Prometheus + Grafana**.  
5️⃣ **Prisma SQL Database for Next.js Application**.

---

## **Next Steps**
- Automate setup using **Jenkins Configuration as Code (JCasC)**.
- Optimize Jenkins plugins for **better performance & security**.
- Set up **auto-scaling Jenkins agents** with Kubernetes.



