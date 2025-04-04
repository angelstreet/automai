# API Routes Architecture Guidelines

## Core Principles

All API routes should follow these core architectural principles:

1. **Routes call Actions** - API routes should not contain business logic
2. **Single Responsibility** - Routes only handle HTTP requests and format responses
3. **Consistent Response Format** - All API responses should follow a standard format

## Architecture Pattern

```
1. Client Component → API Route → Server Action → Database/Services
                         ↓
2. Client Component → Server Action → Database/Services
```

Both patterns are valid depending on whether the client needs HTTP-specific features:

- **Pattern 1** is used when you need HTTP features (headers, status codes, cookies) or when calling from external systems
- **Pattern 2** is a direct call suitable for internal application components

## Guidelines

### 1. API Routes Should Call Server Actions

Routes should be thin controllers that:
- Parse and validate request parameters
- Call appropriate server actions from `/app/actions/`
- Format responses with appropriate HTTP status codes

**Example GET Route:**
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

**Example POST Route:**
```typescript
// src/app/api/cicd/test-connection/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { testCICDProvider } from '@/app/actions/cicdAction';

export async function POST(req: NextRequest) {
  try {
    // Get data from request body
    const { provider } = await req.json();

    // Validate input
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider data is required' },
        { status: 400 },
      );
    }

    // Call server action with validated data
    const result = await testCICDProvider(provider);

    // Format response based on action result
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Connection test failed' },
        { status: 400 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 },
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

**Example GET Action:**
```typescript
// src/app/actions/repositoriesAction.ts

export async function getRepositoryFiles(repositoryId: string, path: string = '', branch: string = 'main') {
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
    const files = await fetchFilesFromRepo(repository, path, branch);
    
    return { success: true, data: files };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**Example POST Action:**
```typescript
// src/app/actions/cicdAction.ts

export async function testCICDProvider(provider: CICDProviderPayload): Promise<ActionResult> {
  try {
    // Basic validation
    if (!provider.url) {
      return { success: false, error: 'Provider URL is required' };
    }

    if (!provider.type) {
      return { success: false, error: 'Provider type is required' };
    }

    // Authentication check
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Provider-specific logic
    if (provider.type === 'jenkins') {
      const jenkinsUrl = provider.url;
      const username = provider.config.credentials?.username;
      const apiToken = provider.config.credentials?.token;

      // Additional validation
      if (!username || !apiToken) {
        return { success: false, error: 'Jenkins credentials required' };
      }

      // External service interaction
      try {
        const response = await testJenkinsConnection(jenkinsUrl, username, apiToken);
        return { success: true, data: response };
      } catch (error) {
        return { success: false, error: `Connection failed: ${error.message}` };
      }
    }

    return { success: false, error: 'Unsupported provider type' };
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
5. ❌ **Direct external API calls in actions**: External API calls should be wrapped in service modules

## Client-Side Calls

There are two ways to call server-side functionality from client components:

### 1. API Route Pattern (For External Access or Special HTTP Features)

```
Client Component → fetch('/api/...') → API Route → Server Action → Database/Services
```

**When to use:**
- When you need HTTP status codes, headers, cookies
- When the endpoint needs to be accessible externally
- When integrating with third-party services
- When you need specific HTTP verbs (GET, POST, PUT, DELETE)

### 2. Direct Server Action Call (For Internal App Components)

```
Client Component → Server Action (with 'use server') → Database/Services
```

**When to use:**
- For internal client components calling server logic
- When you don't need HTTP-specific features
- For simpler server/client integration
- When the functionality will only be called from within the app

## External API Calls

For external API calls from server actions, follow this pattern:

1. Create a service module in `/src/lib/services/` that wraps external API calls
2. Use the service in your action, not direct fetch calls

```
Server Action → Service Module → External API
```

**Bad:**
```typescript
// In action
export async function testConnection(token: string) {
  const response = await fetch('https://api.external.com/test', {
    headers: { Authorization: `token ${token}` }
  });
  return { success: response.ok };
}
```

**Good:**
```typescript
// In /src/lib/services/externalService.ts
export async function testExternalConnection(token: string): Promise<ApiResponse<any>> {
  try {
    const response = await fetch('https://api.external.com/test', {
      headers: { Authorization: `token ${token}` }
    });
    
    if (!response.ok) {
      return { success: false, error: `Failed with status ${response.status}` };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// In action
export async function testConnection(token: string) {
  return await externalService.testExternalConnection(token);
}
```