# CICD Integration Guide

## Workflow Overview

Our deployment-CICD integration follows this workflow:

1. **Deployment Creation**:

   - When a deployment is created, a CICD job is automatically created and mapped
   - The mapping is stored in `public.deployment_cicd_mappings` table
   - The deployment status is stored in `public.deployments` table
   - The job details are stored in `public.cicd_jobs` table

2. **Running a Deployment**:

   ```typescript
   // 1. Get CICD job mapping
   const mappingResult = await cicdDb.getCICDDeploymentMapping(
     { where: { deployment_id: deploymentId } },
     cookieStore,
   );

   // 2. Trigger the existing CICD job
   const triggerResult = await cicdService.triggerJob(
     providerId,
     jobId,
     deploymentParameters,
     cookieStore,
   );

   // 3. Update deployment status to 'running'
   await deploymentDb.updateDeploymentStatus(deploymentId, 'running', cookieStore);
   ```

3. **Status Updates via Webhook**:

   ```typescript
   // src/app/[locale]/[tenant]/deployment/webhooks/jenkins/route.ts
   export async function POST(req: Request) {
     const cookieStore = cookies();
     const payload = await req.json();
     const { jobId, status, buildNumber } = payload;

     // 1. Update CICD job status
     await cicdDb.updateJobStatus(jobId, status, cookieStore);

     // 2. Query both tables to determine overall status
     const jobMapping = await cicdDb.getCICDDeploymentMapping(
       { where: { cicd_job_id: jobId } },
       cookieStore,
     );

     if (jobMapping.success && jobMapping.data) {
       const deploymentId = jobMapping.data.deployment_id;

       // Get latest job status
       const jobResult = await cicdDb.getCICDJob({ where: { id: jobId } }, cookieStore);

       if (jobResult.success && jobResult.data) {
         // Map CICD status to deployment status
         const deploymentStatus = mapCICDStatusToDeploymentStatus(jobResult.data.status);

         // Update deployment status
         await deploymentDb.updateDeploymentStatus(deploymentId, deploymentStatus, cookieStore);

         // Dispatch event for UI update
         dispatchEvent(DeploymentEvents.DEPLOYMENT_STATUS_UPDATE, {
           deploymentId,
           status: deploymentStatus,
           jobId,
           buildNumber,
         });
       }
     }
   }
   ```

## Database Schema

### Tables Relationship

```
public.deployments
└── public.deployment_cicd_mappings
    └── public.cicd_jobs
```

### Status Flow

1. Deployment created → CICD job created → Mapping created
2. Deployment triggered → CICD job status updated → Deployment status updated
3. Webhook received → CICD job status updated → Query both tables → Update deployment status

## Event-Based Communication

### Events Structure

```typescript
// src/components/listeners/DeploymentEventListener.tsx
export const DeploymentEvents = {
  // Status Update Events
  DEPLOYMENT_STATUS_UPDATE: 'DEPLOYMENT_STATUS_UPDATE',
  DEPLOYMENT_RUN_START: 'DEPLOYMENT_RUN_START',
  DEPLOYMENT_RUN_FAILURE: 'DEPLOYMENT_RUN_FAILURE',
};
```

## Jenkins Integration

### 1. Webhook Setup

1. Configure Jenkins Notification Plugin:

   - Install "Notification Plugin" in Jenkins
   - Add webhook URL: `https://your-domain/[locale]/[tenant]/deployment/webhooks/jenkins`
   - Configure payload format:
     ```json
     {
       "jobId": "job-123",
       "status": "SUCCESS|FAILURE|RUNNING",
       "buildNumber": "123",
       "timestamp": "2024-03-20T12:00:00Z"
     }
     ```

2. Status Mapping:
   ```typescript
   function mapCICDStatusToDeploymentStatus(cicdStatus: string): DeploymentStatus {
     switch (cicdStatus.toLowerCase()) {
       case 'success':
         return 'completed';
       case 'failure':
         return 'failed';
       case 'running':
         return 'running';
       default:
         return 'pending';
     }
   }
   ```

## Implementation Plan

### 1. Update `runDeployment` in `deploymentsAction.ts`

- Modify to retrieve the CICD job mapping for the deployment
- Use `cicdService.triggerJob()` to trigger the existing Jenkins job
- Update deployment status to "running"

### 2. Create webhook endpoint

- Create `src/app/[locale]/[tenant]/deployment/webhooks/jenkins/route.ts`
- Implement payload validation
- Update CICD job status
- Query deployment mapping
- Update deployment status based on mapping

### 3. Add necessary DB layer functions

- Ensure `cicdDb` has a function to update job status
- Use existing `deploymentDb.updateDeploymentStatus` function

## Best Practices

1. **Status Consistency**

   - Always update CICD job status first
   - Query both tables to determine overall status
   - Use transactions when updating related tables

2. **Error Handling**

   - Validate webhook payload
   - Handle missing mappings gracefully
   - Log all status transitions

3. **Security**
   - Validate webhook signatures
   - Implement rate limiting
   - Sanitize all inputs

## Logging Standards

Follow the established logging format:

```typescript
console.log(`[@webhook:jenkins] Received status update for job: ${jobId}`);
console.log(`[@webhook:jenkins] Updating deployment status: ${deploymentId} -> ${status}`);
console.error(`[@webhook:jenkins] Error processing webhook: ${error.message}`);
```
