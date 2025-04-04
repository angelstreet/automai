# API Routes Architecture Guidelines

## Core Principles

All API routes should follow these core architectural principles:

1. **Routes call Actions** - API routes should not contain business logic
2. **Single Responsibility** - Routes only handle HTTP requests and format responses
3. **Consistent Response Format** - All API responses should follow a standard format

## Architecture Pattern

```
HTTP Request → API Route → Server Action → Database
                                        ↘ External Services
```

## Guidelines

### 1. API Routes Should Call Server Actions

Routes should be thin controllers that:
- Parse and validate request parameters
- Call appropriate server actions from `/app/actions/`
- Format responses with appropriate HTTP status codes

**Example:**
```typescript
// src/app/api/repositories/explore/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getRepositoryFiles } from '@/app/actions/repositoriesAction';

export async function GET(request: NextRequest) {
  try {
    // Parse parameters
    const url = new URL(request.url);
    const repositoryId = url.searchParams.get('repositoryId');
    
    // Validate parameters
    if (!repositoryId) {
      return NextResponse.json(
        { success: false, error: 'Repository ID is required' },
        { status: 400 }
      );
    }
    
    // Call server action (contains all business logic)
    const result = await getRepositoryFiles(repositoryId);
    
    // Format response based on action result
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Server Actions Contain All Business Logic

Server actions should:
- Implement all business logic and validation
- Handle interactions with databases and external services
- Return consistent response formats
- Be reusable across routes and components

**Example:**
```typescript
// src/app/actions/repositoriesAction.ts

export async function getRepositoryFiles(repositoryId: string) {
  try {
    // Authentication and validation
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Business logic
    const repository = await getRepository(repositoryId);
    if (!repository) {
      return { success: false, error: 'Repository not found' };
    }
    
    // Data access
    const files = await fetchFilesFromRepo(repository);
    
    return { success: true, data: files };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### 3. Standard Response Format

API responses should follow a consistent format:

```typescript
// Success response
{
  success: true,
  data: { ... } | [ ... ]  // Response data
}

// Error response
{
  success: false,
  error: "Error message"
}
```

## Benefits

This architectural approach provides:

- **Separation of Concerns** - Routes handle HTTP, actions handle business logic
- **Code Reusability** - Server actions can be called from multiple routes or components
- **Maintainability** - Changes to business logic only happen in one place
- **Testability** - Actions can be tested in isolation
- **Consistent Error Handling** - Standard approach to errors across the application

## Anti-Patterns to Avoid

1. ❌ **Routes directly accessing database**: Routes should never directly call database functions
2. ❌ **Duplicating logic between routes and actions**: Don't implement the same logic in both places
3. ❌ **Business logic in routes**: Keep routes focused on HTTP handling only
4. ❌ **Inconsistent response formats**: All API responses should follow the standard format