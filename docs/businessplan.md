# Business Plan & Pricing Model

## 1. Overview

This document defines the pricing model for Automai SaaS, covering **Trial, Pro, and Enterprise plans** along with integration details for the **landing page and pricing page**.

## 2. Pricing Structure

### 2.1 Trial Plan (Free)

- **Price:** $0
- **Limitations:**
  - **1 Project Only**
  - **Max 5 Use Cases**
  - **1 Campaign**
  - **Only 1 Web Environment Execution**
  - **No Team Management**
- **Upgrade Prompt:** Encourages users to upgrade to Pro or Enterprise.

### 2.2 Pro Plan

- **Price:** $29/month or $290/year (2 months free)
- **Features:**
  - **Unlimited Projects, Use Cases, and Campaigns**
  - **Supports Multiple Environments (Web, Mobile, Cloud)**
  - **No Team Management (Single User Only)**
  - **Access to Advanced Reports & Integrations**
- **Target Audience:** Solo developers and testers who need premium features without team collaboration.

### 2.3 Enterprise Plan

- **Price:** $99/user/month (custom pricing for large teams)
- **Features:**
  - **Everything in Pro + Team Management**
  - **Admin Panel & Billing Management**
  - **Integration Support (Jira, Slack, CI/CD)**
  - **Multi-Tenant Workspaces**
- **Target Audience:** QA teams, companies needing automation at scale.

## 3. Billing & Subscription Integration

- **Payment Provider:** Stripe / Paddle
- **Subscription API Endpoints:**
  - `POST /api/billing/checkout` → Initiates payment.
  - `GET /api/billing/status` → Checks user plan.
  - `POST /api/tenants` → Auto-create tenant on Pro/Enterprise signup.

## 4. Pricing Page Implementation

### 4.1 UI Components

- **Pricing Cards:** Clearly showing feature differences.
- **CTA (Call to Action) Buttons:** Upgrade options.
- **FAQ Section:** Common subscription queries.

### 4.2 Landing Page Integration

- **Marketing Section:** Highlighting automation benefits.
- **Testimonials & Case Studies:** For credibility.
- **Comparison Table:** Showing differences between plans.

---
