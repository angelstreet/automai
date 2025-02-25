# Remote Machine Connection Implementation

## Overview

The Remote Machine Connection feature allows users to connect to, monitor, and manage remote machines (SSH servers) and container hosts (Docker/Portainer) from a central dashboard. This implementation plan outlines the necessary steps to create this functionality with appropriate security controls and user experience.

## Key Features

1. **Connection Management**
   - Connect to remote systems via SSH, Docker API, or Portainer API
   - Test connections before saving to ensure they work
   - View connection status and appropriate error feedback
   - Securely store connection credentials

2. **Access Control**
   - Associate connections with individual users (free/trial) or tenants (pro/enterprise)
   - Implement proper permission controls based on user roles
   - Secure credential storage with encryption

3. **User Interface**
   - Intuitive connection dialog with type-specific options
   - Visual indicators for connection status and errors
   - Empty state handling for new users

## Implementation Plan

### 1. Backend Changes

1. **Create New API Endpoints**
   - `POST /api/virtualization/machines/test-connection` - Test connection without saving
   - `POST /api/virtualization/machines` - Create new connection
   - `GET /api/virtualization/machines` - List all connections
   - `GET /api/virtualization/machines/:id` - Get single connection
   - `DELETE /api/virtualization/machines/:id` - Delete connection
   - Include appropriate error handling and status codes

2. **Create Connection Services**
   - Implement SSH connection testing using `ssh2` library
   - Implement Docker API connection testing
   - Implement Portainer API connection testing
   - Create secure credential storage service

3. **Update Prisma Schema**
   - Add a new `Machine` model to store connection information:
     ```prisma
     model Machine {
       id            String    @id @default(uuid())
       name          String
       description   String?
       
       // Connection details
       type          String    // ssh, docker, portainer
       ip            String
       port          Int?      // Optional port override
       
       // SSH specific fields
       user          String?   // Required for SSH
       password      String?   // Optional for SSH (encrypted)
       privateKey    String?   // Optional for SSH (encrypted)
       keyPassphrase String?   // Optional for SSH key (encrypted)
       
       // Docker/Portainer specific
       useTls        Boolean   @default(false)
       tlsCert       String?   // Encrypted
       tlsKey        String?   // Encrypted
       apiKey        String?   // For Portainer (encrypted)
       
       // Status fields
       status        String    @default("pending") // connected, failed, pending
       lastConnected DateTime?
       errorMessage  String?
       lastTestedAt  DateTime?
       
       // Metadata
       containerCount Int?
       runningContainers Int?
       
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

4. **Security Implementation**
   - Implement credential encryption/decryption service
   - Add authentication middleware for all endpoints
   - Add tenant-scoping for all queries
   - Implement proper error handling for connection failures

### 2. Frontend Changes

1. **Update Machine Type Definitions**
   - Create a comprehensive interface for machine connections:
     ```typescript
     export interface Machine {
       id: string;
       name: string;
       description?: string;
       
       // Connection details
       type: 'ssh' | 'docker' | 'portainer';
       ip: string;
       port?: number;
       
       // Status fields
       status: 'connected' | 'failed' | 'pending';
       lastConnected?: Date;
       errorMessage?: string;
       
       // Metadata
       containerCount?: number;
       runningContainers?: number;
       
       createdAt: Date;
       updatedAt: Date;
     }
     ```

2. **Create Connection Dialog Component**
   - Rename from `CreateVMDialog` to `ConnectMachineDialog`
   - Implement tabbed interface for different connection types
   - Add the following features:
     - Port configuration with appropriate defaults
     - SSH key authentication option
     - TLS/SSL configuration for Docker/Portainer
     - Test connection functionality
     - Improved validation with specific error messages
     - Loading states during connection testing
     - Success/failure feedback

3. **Create Machine List Components**
   - Rename from `DeviceList` to `MachineList`
   - Add empty state UI for new users
   - Implement loading states for API requests
   - Display connection status visually
   - Show appropriate error messages
   - Include basic container/host info when available

4. **Update Main Page**
   - Remove mock data generation
   - Implement API calls to fetch real data
   - Add loading states and error handling
   - Implement pagination with real data

### 3. Implementation Phases

#### Phase 1: Foundation
1. Create database schema and run migrations
2. Create basic API endpoints without connection testing
3. Update frontend type definitions
4. Remove mock data and implement empty state UI

#### Phase 2: Connection Implementation
1. Implement SSH connection testing
2. Implement Docker/Portainer connection testing
3. Update connection dialog with basic fields
4. Implement basic list component with connection status

#### Phase 3: Advanced Features
1. Add SSH key authentication
2. Add TLS/SSL for Docker/Portainer
3. Implement advanced connection options
4. Add container information display

#### Phase 4: Security & Polish
1. Implement credential encryption
2. Add proper error handling and validation
3. Implement user/tenant permission controls
4. Add UI polish and feedback improvements

## Security Considerations

1. **Credential Storage**
   - All passwords, private keys, and API keys must be encrypted at rest
   - Use strong encryption with proper key management
   - Never return sensitive data in API responses

2. **Connection Security**
   - Support SSH key authentication as a more secure option
   - Support TLS/SSL for Docker and Portainer connections
   - Validate certificates and keys properly
   - Implement timeouts and rate limiting

3. **Access Control**
   - Properly scope all data to the authenticated user/tenant
   - Implement role-based access controls
   - Log all connection attempts for audit purposes

## Testing Plan

1. **Connection Testing**
   - Test SSH connection with valid/invalid credentials
   - Test SSH connection with valid/invalid keys
   - Test Docker connection with/without TLS
   - Test Portainer connection with API key

2. **Error Handling**
   - Test network timeout scenarios
   - Test authentication failure scenarios
   - Test TLS certificate validation failures

3. **UI Testing**
   - Test empty state rendering
   - Test loading states
   - Test error display
   - Test success flow

## Terminology Guidelines

- Use "Machine" for SSH-connected servers
- Use "Container Host" for Docker/Portainer connections
- Collectively refer to them as "Remote Environments"
- Use "Connection" when referring to the link between the application and the remote system

Would you like me to proceed with implementing these changes?
