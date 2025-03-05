Below is the fully revised version of your "Final Jenkins Full Guide (Google Cloud Deployment)" with all sections updated, including the simplified ASCII diagrams integrated where applicable. I've refined the content for clarity, consistency, and completeness while incorporating the ASCII visual descriptions you requested.

---

# **Final Jenkins Full Guide (Google Cloud Deployment)**

## **1️⃣ Overview**
Jenkins is an open-source **CI/CD automation server** designed for **multi-tenancy, multi-user access, and multi-environment deployments**. This guide details deploying a centralized Jenkins instance on Google Cloud, leveraging free-tier resources where possible.

**What You’ll Get:**
- ✅ Centralized Jenkins architecture on Google Cloud  
- ✅ Key features and tech stack  
- ✅ Infrastructure setup with Terraform and Helm  
- ✅ Installation and configuration steps  
- ✅ Auto-scaling Jenkins agents using Google Kubernetes Engine (GKE)  
- ✅ Pre-configured Jenkinsfiles for SSH, Portainer, and Rancher deployments  
- ✅ Simplified ASCII workflow and architecture diagrams  

---

## **2️⃣ Features of Centralized Jenkins**
| **Feature**          | **Description**                                      |
|----------------------|-----------------------------------------------------|
| **Multi-Tenant**     | Isolated projects via **folders and RBAC**          |
| **Multi-User**       | RBAC for **Admins, Developers, Testers, Viewers**   |
| **Multi-Project**    | Supports **monorepo and multi-repo pipelines**      |
| **Multi-Environment**| Deployments to **dev, staging, prod**              |
| **Auto-Scaling**     | On-demand Jenkins agents in **Kubernetes (GKE)**    |
| **Monitoring**       | **Prometheus + Grafana** for real-time insights     |

---

## **3️⃣ Tech Stack**
- ✅ **Jenkins**: Core CI/CD pipeline management  
- ✅ **Google Cloud Compute Engine (E2-Micro Free Tier)**: Jenkins Master  
- ✅ **Google Kubernetes Engine (GKE Free Tier)**: Auto-scaling agents  
- ✅ **Terraform**: Infrastructure as Code (IaC)  
- ✅ **Helm**: Simplified Jenkins deployment on Kubernetes  
- ✅ **Prometheus + Grafana**: Monitoring and visualization  
- ✅ **GitHub/GitLab/Gitea**: Source code repositories  
- ✅ **Vault/Google Secret Manager**: Secure credential storage  

---

## **4️⃣ Infrastructure Overview**
### **High-Level Flow**
```
[Git Repository] --> [Jenkins Master (GCE)] --> [Jenkins Agents (GKE)] --> [Deployment Targets: SSH / Portainer / Rancher]
```

### **🔹 Simplified ASCII Architecture Diagram**
```
[Git Repo] --> [Jenkins Master (GCE)] --> [Jenkins Agents (GKE)]
    |                 |                        |
    |                 |                        +----> [SSH Deployment]
    |                 |                        +----> [Portainer Deployment]
    |                 |                        +----> [Rancher Deployment]
    |                 |
    +----> [Prometheus + Grafana] <----+
    |                                    |
    +----> [Vault / Google Secret Manager]
```
**Notes**: 
- Arrows (`-->`) show the workflow direction.
- Branches (`+---->`) indicate deployment options and monitoring/secrets integration.

---

## **5️⃣ Infrastructure Setup with Terraform**

### **🔹 Step 1: Initialize Terraform**
```sh
terraform init
```

### **🔹 Step 2: Deploy Infrastructure**
```sh
terraform apply -auto-approve
```

### **🔹 Terraform Configuration (main.tf)**
```hcl
provider "google" {
  project = "your-gcp-project-id"
  region  = "us-central1"
  credentials = file("path/to/your-service-account-key.json")  # Add for authentication
}

# Jenkins Master on GCE
resource "google_compute_instance" "jenkins_master" {
  name         = "jenkins-master"
  machine_type = "e2-micro"  # Free tier eligible
  zone         = "us-central1-a"
  tags         = ["jenkins", "http-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 30  # GB
    }
  }

  network_interface {
    network = "default"
    access_config {}  # Assigns external IP
  }
}

# GKE Cluster for Jenkins Agents
resource "google_container_cluster" "jenkins_cluster" {
  name     = "jenkins-cluster"
  location = "us-central1"
  remove_default_node_pool = true  # Custom node pool for flexibility
  initial_node_count = 1
}

resource "google_container_node_pool" "jenkins_node_pool" {
  name       = "jenkins-node-pool"
  cluster    = google_container_cluster.jenkins_cluster.name
  location   = "us-central1"
  node_count = 1

  autoscaling {
    min_node_count = 1
    max_node_count = 3
  }

  node_config {
    machine_type = "e2-standard-2"
    preemptible  = true  # Cost-saving option
  }
}
```

---

## **6️⃣ Install Jenkins on GKE with Helm**
### **🔹 Add Jenkins Helm Repo**
```sh
helm repo add jenkins https://charts.jenkins.io
helm repo update
```

### **🔹 Install Jenkins**
```sh
helm install jenkins jenkins/jenkins \
  --namespace jenkins \
  --create-namespace \
  --set controller.serviceType=LoadBalancer \
  --set agent.enabled=true \
  --set persistence.enabled=true \
  --set persistence.size=10Gi
```

### **🔹 Enable Auto-Scaling for Agents**
```sh
kubectl autoscale deployment jenkins-agent --cpu-percent=50 --min=1 --max=5 -n jenkins
```

### **🔹 Access Jenkins**
```sh
# Get admin password
kubectl get secret --namespace jenkins jenkins \
  -o jsonpath="{.data.jenkins-admin-password}" | base64 --decode

# Get LoadBalancer IP
kubectl get svc -n jenkins jenkins --output jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

---

## **7️⃣ Configuration for Multi-Tenancy**
### **🔹 RBAC Workflow**
- **Folders**: `/Tenants/Tenant-1`, `/Teams/Backend`
- **Roles**: `Admin` (full control), `Developer` (build/run), `Tester` (view/test), `Viewer` (read-only)
- **Credentials**: Scoped per folder/project via **Google Secret Manager** or **Jenkins Credentials Plugin**.

### **🔹 Multi-Environment Pipeline**
```groovy
pipeline {
    agent any
    parameters {
        choice(name: 'ENV', choices: ['dev', 'staging', 'prod'], description: 'Target Environment')
    }
    stages {
        stage('Deploy') {
            steps {
                sh "kubectl apply -f k8s/deployment-${params.ENV}.yaml"
            }
        }
    }
}
```

---

## **8️⃣ Pre-Configured Jenkinsfiles**
### **🔹 Simplified ASCII Deployment Workflow Diagram**
```
[Pipeline Trigger] --> [Build Stage] --> [Deploy Stage]
                                    |
                                    +----> [SSH Deployment]
                                    +----> [Portainer Deployment]
                                    +----> [Rancher Deployment]
```
**Notes**: 
- Shows the pipeline flow from trigger to deployment options.

### **🔹 Deploy via SSH**
```groovy
pipeline {
    agent any
    stages {
        stage('Deploy via SSH') {
            steps {
                sshagent(credentials: ['ssh-credentials-id']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no user@remote-server \
                        "cd /app && git pull && npm install && pm2 restart app"
                    '''
                }
            }
        }
    }
}
```

### **🔹 Deploy via Portainer**
```groovy
pipeline {
    agent any
    environment {
        PORTAINER_API = 'https://portainer.example.com'
        STACK_NAME = 'my-app'
        PORTAINER_API_KEY = credentials('portainer-api-key')  # Securely stored
    }
    stages {
        stage('Deploy via Portainer') {
            steps {
                sh """
                    curl -X POST -H "Authorization: Bearer \${PORTAINER_API_KEY}" \
                    "\${PORTAINER_API}/api/stacks/\${STACK_NAME}/update?pull=true"
                """
            }
        }
    }
}
```

### **🔹 Deploy via Rancher**
```groovy
pipeline {
    agent any
    environment {
        RANCHER_API = 'https://rancher.example.com/v3'
        CLUSTER_ID = 'c-xxxxx'
        NAMESPACE = 'my-namespace'
        WORKLOAD = 'deployment:my-app'
        RANCHER_API_KEY = credentials('rancher-api-key')  # Securely stored
    }
    stages {
        stage('Deploy via Rancher') {
            steps {
                sh """
                    curl -X POST -H "Authorization: Bearer \${RANCHER_API_KEY}" \
                    "\${RANCHER_API}/clusters/\${CLUSTER_ID}/workloads/\${NAMESPACE}:\${WORKLOAD}?action=redeploy"
                """
            }
        }
    }
}
```

---

## **9️⃣ Next Steps**
- **GitOps with ArgoCD**: Integrate for automated deployments.
- **Enhanced Monitoring**: Add logging with Loki or ELK stack.
- **Cost Optimization**: Use Spot VMs or additional free-tier tweaks.

Let me know how you’d like to proceed or if you want further refinements! 🚀

---

### **Key Improvements**
1. **ASCII Diagrams**: Added under **4️⃣ Infrastructure Overview** and **8️⃣ Pre-Configured Jenkinsfiles** to replace image references with text-based visuals.
2. **Consistency**: Standardized formatting and terminology across sections.
3. **Clarity**: Enhanced explanations and added minor tweaks (e.g., credential binding, SSH options).

Would you like me to expand any section further or adjust the ASCII diagrams?