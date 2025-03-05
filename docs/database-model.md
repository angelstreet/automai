# Database Model

This document describes the database schema and model relationships for the AutomAI application.

## Overview

The database uses PostgreSQL with Prisma ORM. The schema is designed to support multi-tenancy, user authentication, and test automation management.

## Key Entities

### User

Represents application users with authentication information.

```prisma
model User {
  id            String       @id @default(cuid())
  name          String?
  email         String?      @unique
  emailVerified DateTime?
  password      String?
  image         String?
  role          String       @default("user")
  tenantId      String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  provider      String?
  accounts      Account[]
  connections   Connection[]
  tenant        Tenant?      @relation(fields: [tenantId], references: [id])

  @@map("users")
}
```

### Tenant

Represents organizations or subscription plans in the multi-tenant setup.

```prisma
model Tenant {
  id          String       @id @default(cuid())
  name        String
  domain      String?      @unique
  plan        String       @default("admin")
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  connections Connection[]
  users       User[]

  @@map("tenants")
}
```

### Host

Represents physical or virtual machines that can run tests.

```prisma
model Host {
  id          String   @id @default(cuid())
  name        String
  description String?
  type        String
  ip          String
  port        Int?
  user        String?
  password    String?
  status      String   @default("pending")
  is_windows  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Connection

Represents connection details for remote hosts.

```prisma
model Connection {
  id         String   @id @default(cuid())
  name       String
  host       String
  port       Int      @default(22)
  username   String
  password   String?
  privateKey String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  userId     String
  tenantId   String?
  tenant     Tenant?  @relation(fields: [tenantId], references: [id])
  user       User     @relation(fields: [userId], references: [id])

  @@map("connections")
}
```

### GitProvider

Represents Git provider configurations (GitHub, GitLab, etc.).

```prisma
model GitProvider {
  id           String       @id @default(cuid())
  name         String
  displayName  String?
  type         String
  serverUrl    String?
  accessToken  String?
  refreshToken String?
  expiresAt    DateTime?
  userId       String
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  repositories Repository[]

  @@map("git_providers")
}
```

### Repository

Represents Git repositories connected to the application.

```prisma
model Repository {
  id            String      @id @default(cuid())
  name          String
  description   String?
  url           String?
  defaultBranch String?
  providerId    String
  syncStatus    String      @default("PENDING")
  lastSyncedAt  DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  provider      GitProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@map("repositories")
}
```

### Authentication Models

Standard NextAuth.js models for authentication.

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verificationtokens")
}
```

## Relationships

- **User to Tenant**: Many-to-one relationship. Users belong to a single tenant.
- **Tenant to User**: One-to-many relationship. Tenants can have multiple users.
- **User to Connection**: One-to-many relationship. Users can have multiple connections.
- **Tenant to Connection**: One-to-many relationship. Tenants can have multiple connections.
- **User to Account**: One-to-many relationship. Users can have multiple OAuth accounts.
- **GitProvider to Repository**: One-to-many relationship. Git providers can have multiple repositories.

## Multi-Tenancy Model

The application uses a multi-tenant architecture with tenant isolation:

1. **Tenant Identification**:

   - Each user is associated with a tenant via `tenantId`
   - The tenant determines the user's plan and access level

2. **Data Isolation**:

   - All queries should include tenant filtering
   - Middleware ensures users can only access their tenant's data

3. **Tenant Plans**:
   - **Trial**: Default plan for new users
   - **Pro**: Paid basic subscription
   - **Enterprise**: Custom enterprise deployments

## Usage Patterns

### Creating a New User with Tenant

```typescript
// Creating a new user and tenant in one transaction
await prisma.$transaction(async (tx) => {
  // Create the tenant
  const tenant = await tx.tenant.create({
    data: {
      name: 'New Tenant',
      domain: 'new-tenant',
      plan: 'trial',
    },
  });

  // Create the user with tenant association
  const user = await tx.user.create({
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      role: 'admin',
      tenantId: tenant.id,
    },
  });

  return { user, tenant };
});
```

### Tenant-Scoped Queries

All data access should be tenant-scoped:

```typescript
// Get projects for a specific tenant
const projects = await prisma.project.findMany({
  where: {
    tenantId: user.tenantId,
  },
});

// Create a resource within a tenant
const newHost = await prisma.host.create({
  data: {
    name: 'Production Server',
    type: 'linux',
    ip: '192.168.1.100',
    tenantId: user.tenantId,
    userId: user.id,
  },
});
```

## Best Practices

1. **Always Filter by Tenant**:

   - All queries should include tenant filtering
   - API routes should validate tenant access

2. **Use Transactions**:

   - Use transactions for operations that modify multiple tables
   - Ensures data consistency

3. **Secure Credentials**:

   - Encrypt sensitive data (passwords, private keys)
   - Use environment variables for database credentials

4. **Migrations**:

   - Use Prisma migrations for schema changes
   - Test migrations before applying to production

5. **Indexing**:
   - Add indexes for frequently queried fields
   - Includes foreign keys and commonly filtered fields

## Database Operations

### Connection Pooling

The application uses connection pooling for database efficiency:

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Database Migrations

Database schema changes are managed with Prisma migrations:

```bash
# Create a new migration
npx prisma migrate dev --name add_new_field

# Apply migrations in production
npx prisma migrate deploy
```

### Seeding Data

Seed data for development or testing:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create a tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Tenant',
      domain: 'demo',
      plan: 'trial',
    },
  });

  // Create an admin user
  await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: await hash('password123', 10),
      role: 'admin',
      tenantId: tenant.id,
    },
  });

  // Add sample data as needed
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## Prisma Schema File

The complete Prisma schema is defined in `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Schema definitions as shown above
```
