# Jenkins Multi-Tenant Architecture: Centralized & Decentralized Setup with Kubernetes Autoscaling

## Overview
This document provides a detailed guide on setting up **Jenkins for multi-tenancy** with **Kubernetes autoscaling**, covering:
- **Centralized and Decentralized Jenkins Approaches**
- **Multi-Tenant Configuration**
- **Installation and Setup on macOS**
- **Deploying Jenkins on Kubernetes with Helm and Terraform**
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

# 2️⃣ Installing Jenkins on Kubernetes (Helm & Terraform)

## **Using Helm (Recommended for Kubernetes Deployments)**
1️⃣ Add the **Jenkins Helm Repository**:
```sh
helm repo add jenkins https://charts.jenkins.io
helm repo update
```

2️⃣ Install Jenkins with Persistent Storage:
```sh
helm install jenkins jenkins/jenkins \
  --namespace jenkins \
  --create-namespace \
  --set persistence.enabled=true \
  --set persistence.size=10Gi \
  --set controller.serviceType=LoadBalancer \
  --set agent.enabled=true
```

3️⃣ Get the **Admin Password**:
```sh
kubectl get secret --namespace jenkins jenkins \
  -o jsonpath="{.data.jenkins-admin-password}" | base64 --decode
```

4️⃣ Access Jenkins at **http://YOUR-LOADBALANCER-IP**.

---

## **Using Terraform (Recommended for Full Infrastructure Automation)**
1️⃣ **Create a Kubernetes Cluster + Jenkins Helm Deployment**:

```hcl
provider "kubernetes" {
  config_path = "~/.kube/config"
}

resource "kubernetes_namespace" "jenkins" {
  metadata {
    name = "jenkins"
  }
}

resource "helm_release" "jenkins" {
  name       = "jenkins"
  namespace  = kubernetes_namespace.jenkins.metadata[0].name
  repository = "https://charts.jenkins.io"
  chart      = "jenkins"
}
```

2️⃣ **Apply Terraform Configuration**:
```sh
terraform init
terraform apply -auto-approve
```

3️⃣ **Jenkins will be automatically deployed inside Kubernetes.**

---

# 3️⃣ Kubernetes Auto-Scaling for Jenkins Agents

## **Enable Kubernetes Plugin in Jenkins**
1️⃣ Install **Kubernetes Plugin** in Jenkins.
2️⃣ Configure **Kubernetes URL**:
   ```
   https://kubernetes.default.svc.cluster.local
   ```
3️⃣ Define **Pod Templates**:
   - Label: `k8s-agent`
   - Container Image: `jenkins/inbound-agent`

## **Enable Auto-Scaling**
```sh
kubectl autoscale deployment jenkins \
  --namespace=jenkins \
  --cpu-percent=50 --min=1 --max=5
```

---

# 4️⃣ Jenkins Pipeline for Next.js & Prisma Deployment

### **Jenkinsfile (Pipeline for Next.js Deployment in Kubernetes)**
```groovy
pipeline {
    agent { label 'k8s-agent' }
    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main', credentialsId: 'github-ssh-key', url: 'git@github.com:your-repo.git'
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
        stage('Deploy to Kubernetes') {
            steps {
                sh 'kubectl apply -f k8s/deployment.yaml'
            }
        }
    }
}
```

---

# 5️⃣ Monitoring & Scaling Optimization
✅ **Monitor Jenkins Agents in Kubernetes**
```sh
kubectl get pods -n jenkins -w
```
✅ **Monitor Auto-Scaling Activity**
```sh
kubectl get hpa -n jenkins
```
✅ **Centralized Logging with ELK Stack**
```sh
helm install elk stable/elastic-stack
```
✅ **Prometheus & Grafana for Metrics**
```sh
helm install monitoring prometheus-community/kube-prometheus-stack
```

---

# 🚀 Final Architecture
1️⃣ **Jenkins Master on Kubernetes**
2️⃣ **Auto-scaling Jenkins Agents (K8s Pods)**
3️⃣ **RBAC to isolate tenants**
4️⃣ **GitOps Integration (GitHub, GitLab, Gitea)**
5️⃣ **Real-time Monitoring & Scaling**

---

#Yes! You can **try the Kubernetes-based Jenkins auto-scaling setup locally** using **Minikube** or **Kind (Kubernetes in Docker)**.

### **Steps to Run Locally**:
1️⃣ **Install Minikube** (for local Kubernetes)
   ```sh
   brew install minikube
   minikube start --memory=4g --cpus=2
   ```

2️⃣ **Install Helm** (for Jenkins deployment)
   ```sh
   brew install helm
   ```

3️⃣ **Deploy Jenkins on Minikube**
   ```sh
   helm repo add jenkins https://charts.jenkins.io
   helm repo update
   helm install jenkins jenkins/jenkins --namespace jenkins --create-namespace
   ```

4️⃣ **Enable LoadBalancer Access**
   ```sh
   minikube service jenkins --namespace jenkins
   ```

5️⃣ **Enable Auto-Scaling Locally**
   ```sh
   kubectl autoscale deployment jenkins --cpu-percent=50 --min=1 --max=3
   ```

6️⃣ **Check Jenkins Dashboard**
   - Get the **admin password**:
     ```sh
     kubectl get secret --namespace jenkins jenkins -o jsonpath="{.data.jenkins-admin-password}" | base64 --decode
     ```
   - Open **http://localhost:8080** and log in.

Yes! By setting up **Jenkins on Minikube locally**, you can **develop, test, and refine your CI/CD pipelines** before seamlessly migrating to **AWS (EKS - Elastic Kubernetes Service)** or any cloud provider.

---

### **🚀 Deployment Plan: From Local to AWS**
1️⃣ **Develop & Test Locally**  
   - Use **Minikube** to deploy Jenkins, configure pipelines, and test deployments.
   - Validate Kubernetes manifests (`deployment.yaml`, `service.yaml`).
   - Store configurations using **Helm values.yaml** or **Terraform state**.

2️⃣ **Migrate Kubernetes Configurations to AWS (EKS)**  
   - Provision AWS EKS cluster using **Terraform**:
     ```hcl
     resource "aws_eks_cluster" "jenkins" {
       name     = "jenkins-cluster"
       role_arn = aws_iam_role.eks.arn
       vpc_config {
         subnet_ids = aws_subnet.public[*].id
       }
     }
     ```
   - Deploy Jenkins to AWS EKS using **Helm**:
     ```sh
     helm install jenkins jenkins/jenkins --namespace jenkins
     ```

3️⃣ **Migrate Persistent Data**  
   - If using **Persistent Volumes**, backup & restore with:
     ```sh
     kubectl get pvc -n jenkins
     kubectl cp jenkins-pvc:/data /backup/data
     ```

4️⃣ **Update CI/CD Pipelines**  
   - Update **Jenkins pipeline** to deploy to AWS instead of Minikube.
   - Modify **Kubernetes contexts**:
     ```sh
     kubectl config use-context aws-eks
     ```

5️⃣ **Enable Auto-Scaling on AWS**  
   - Install **Cluster Autoscaler for EKS**:
     ```sh
     kubectl apply -f cluster-autoscaler-autodiscover.yaml
     ```
   - Enable **Jenkins agent auto-scaling** on AWS:
     ```sh
     kubectl autoscale deployment jenkins --cpu-percent=50 --min=1 --max=5
     ```

---

### **✅ Final Outcome**
- ✅ **Develop locally with Minikube**  
- ✅ **Seamlessly migrate Jenkins and pipelines to AWS**  
- ✅ **Enable EKS auto-scaling for efficient resource usage**  
- ✅ **Deploy workloads to AWS directly from Jenkins**

Would you like a **Terraform script to automate EKS setup** or a **step-by-step migration guide?** 🚀