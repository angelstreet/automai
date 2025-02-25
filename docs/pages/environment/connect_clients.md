## Implementation Plan

### 1. Backend Changes

1. **Create a new API endpoint for connection testing and client creation**
   - Add a new route in the server API: `POST /api/virtualization/machines`
   - Implement SSH connection testing using a Node.js SSH library (like `ssh2`)
   - Implement Docker/Portainer connection testing using appropriate libraries
   - Store successful connections in the database with proper user/tenant relationships

2. **Update Prisma Schema**
   - Add a new `Machine` model to store connection information:
     ```prisma
     model Machine {
       id            String    @id @default(uuid())
       name          String
       description   String?
       type          String    // ssh, docker, portainer
       ip            String
       port          Int?      // Optional port override
       user          String?   // Required for SSH
       password      String?   // Required for SSH (should be encrypted)
       status        String    @default("pending") // connected, failed, pending
       lastConnected DateTime?
       errorMessage  String?
       
       // User and Tenant relationships
       userId        String?
       user          User?     @relation(fields: [userId], references: [id])
       tenantId      String?
       tenant        Tenant?   @relation(fields: [tenantId], references: [id])
       
       createdAt     DateTime  @default(now())
       updatedAt     DateTime  @updatedAt
       
       @@index([userId])
       @@index([tenantId])
     }
     ```

3. **Update User and Tenant Models**
   - Add relationship to the Machine model:
     ```prisma
     model User {
       // existing fields
       machines      Machine[]
     }
     
     model Tenant {
       // existing fields
       machines      Machine[]
     }
     ```

4. **Access Control Logic**
   - For trial/free users: Machines are linked directly to the user
   - For pro/enterprise users: Machines are linked to the tenant
   - API endpoints should check user's role and tenant status to determine access

### 2. Frontend Changes

1. **Update Types**
   - Create a new `Machine` interface to replace the `Device` interface:
     ```typescript
     export interface Machine {
       id: string;
       name: string;
       description?: string;
       type: 'ssh' | 'docker' | 'portainer';
       ip: string;
       port?: number;
       status: 'connected' | 'failed' | 'pending';
       lastConnected?: Date;
       errorMessage?: string;
       containers?: {
         running: number;
         total: number;
       };
     }
     ```

2. **Remove Mock Data**
   - Remove the `generateTestDevices` function from `virtualization.ts`
   - Update the page to display an empty list initially with proper empty state UI

3. **Update Dialog Component**
   - Rename from `CreateVMDialog` to `ConnectMachineDialog` for clarity
   - Connect the form submission to the new API endpoint
   - Add error handling and success feedback
   - Show connection status in the UI
   - Add proper validation for different connection types

4. **Update List Component**
   - Rename from `DeviceList` to `MachineList` for consistency
   - Modify to handle empty state gracefully
   - Add loading states for API calls
   - Display connection errors when applicable
   - Update all references in other components

### 3. Implementation Steps

1. **Backend First**
   - Create the new API endpoint for machine connections
   - Implement connection testing for different types (SSH, Docker, Portainer)
   - Update the Prisma schema and run migrations
   - Implement proper user/tenant relationship logic

2. **Frontend Next**
   - Update the terminology throughout the UI (machine instead of device/VM)
   - Update the dialog component to connect to the new API
   - Remove mock data and update the page to fetch from API
   - Add proper error handling and loading states
   - Implement success/failure feedback

3. **Testing**
   - Test SSH connection with valid credentials
   - Test Docker/Portainer connections
   - Test error handling with invalid credentials
   - Verify the machine appears in the list after successful connection
   - Verify proper user/tenant access controls

This approach follows the backend architecture guidelines from the documentation, using Prisma for data storage and implementing proper error handling. The connection testing will be done server-side for security, and the UI will provide appropriate feedback based on the connection result.

### 4. Terminology Guidelines

- Use "Machine" for SSH-connected servers
- Use "Container Host" for Docker/Portainer connections
- Collectively refer to them as "Client Machines" or "Remote Environments"
- Avoid using "Device" to prevent confusion with mobile devices (Android/iOS)

Would you like me to proceed with implementing these changes?
