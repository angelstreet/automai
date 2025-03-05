# API Standards

This document outlines the standards and patterns for API development in the AutomAI project.

## API Design Principles

The AutomAI project follows RESTful API design principles with consistent patterns:

1. **Use HTTP Methods Properly**
   - GET: Retrieve resources
   - POST: Create resources
   - PUT: Update resources (full update)
   - PATCH: Partial update of resources
   - DELETE: Remove resources

2. **Resource-Oriented URLs**
   - Use nouns, not verbs (e.g., `/api/users`, not `/api/getUsers`)
   - Use plural nouns for collections (e.g., `/api/projects`, not `/api/project`)
   - Use nested resources where appropriate (e.g., `/api/projects/{id}/tasks`)

3. **Consistent Response Format**
   ```json
   {
     "success": true,
     "data": {...},
     "message": "Optional message"
   }
   ```

   Error format:
   ```json
   {
     "success": false,
     "error": "Error message",
     "code": "ERROR_CODE"
   }
   ```

4. **HTTP Status Codes**
   - 200: Success
   - 201: Created
   - 400: Bad Request
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not Found
   - 500: Internal Server Error

## API Implementation

### Route Structure

All API routes should be implemented as Next.js Route Handlers in `src/app/api/`:

```
src/app/api/
  ├── [resource]/
  │   ├── route.ts            # Handles GET (list) and POST (create)
  │   ├── [id]/
  │   │   └── route.ts        # Handles GET, PUT, PATCH, DELETE for single resource
  │   ├── schema.ts           # Validation schema
  │   └── types.ts            # Type definitions
```

### Route Handler Example

```typescript
// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Validation schema
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '10');
    const page = Number(searchParams.get('page') || '1');

    // Fetch data with pagination
    const projects = await prisma.project.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        tenantId: session.user.tenantId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Count total for pagination
    const total = await prisma.project.count({
      where: {
        tenantId: session.user.tenantId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        projects,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch projects',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createProjectSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validatedData.error.format(),
      }, { status: 400 });
    }

    // Create the resource
    const project = await prisma.project.create({
      data: {
        ...validatedData.data,
        tenantId: session.user.tenantId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create project',
    }, { status: 500 });
  }
}
```

### Single Resource Handler Example

```typescript
// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Validation schema for updates
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Fetch the resource
    const project = await prisma.project.findUnique({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch project',
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProjectSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validatedData.error.format(),
      }, { status: 400 });
    }

    // Check if resource exists
    const existingProject = await prisma.project.findUnique({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingProject) {
      return NextResponse.json({
        success: false,
        error: 'Project not found',
      }, { status: 404 });
    }

    // Update the resource
    const project = await prisma.project.update({
      where: {
        id: params.id,
      },
      data: validatedData.data,
    });

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update project',
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Check if resource exists
    const existingProject = await prisma.project.findUnique({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingProject) {
      return NextResponse.json({
        success: false,
        error: 'Project not found',
      }, { status: 404 });
    }

    // Delete the resource
    await prisma.project.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete project',
    }, { status: 500 });
  }
}
```

## API Testing

Every API endpoint should have corresponding tests to ensure functionality:

```typescript
// tests/api/projects.test.ts
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/projects/route';

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      tenantId: 'test-tenant-id',
    },
  })),
}));

describe('Projects API', () => {
  describe('GET /api/projects', () => {
    it('should return a list of projects', async () => {
      const { req } = createMocks({
        method: 'GET',
      });

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.projects)).toBe(true);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          name: 'Test Project',
          description: 'This is a test project',
        },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test Project');
    });

    it('should return validation error for invalid data', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          // Missing required name field
          description: 'This is a test project',
        },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request data');
    });
  });
});
```

## API Documentation

API endpoints should be well-documented using TSDoc comments in the route files:

```typescript
/**
 * Get a list of projects
 * 
 * @route GET /api/projects
 * @query limit - Number of projects to return (default: 10)
 * @query page - Page number (default: 1)
 * @returns Paginated list of projects
 * @throws 401 - Unauthorized
 * @throws 500 - Server error
 */
export async function GET(request: NextRequest) {
  // Implementation
}
```

## Error Handling

Implement proper error handling with appropriate status codes and error messages:

1. **Validation Errors**: 400 Bad Request
2. **Authentication Errors**: 401 Unauthorized
3. **Permission Errors**: 403 Forbidden
4. **Not Found Errors**: 404 Not Found
5. **Internal Errors**: 500 Internal Server Error

## Security Best Practices

1. **Authentication**: Always validate the user session before processing requests
2. **Tenant Isolation**: Always filter resources by the user's tenant ID
3. **Input Validation**: Validate all input data using Zod or similar library
4. **Rate Limiting**: Implement rate limiting for public endpoints
5. **CORS**: Configure CORS to allow only trusted domains
6. **Logging**: Log all API requests and errors for auditing
7. **Error Handling**: Never expose sensitive information in error messages