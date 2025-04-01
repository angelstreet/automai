# AutomAI Library Structure

This directory contains the core library code for AutomAI, organized with a maximum depth of 2 levels for clarity and maintainability.

## Directory Structure

- `/db/` - Database access layer
  - Files named with the pattern `*Db.ts`
  - Directly interacts with Supabase
  - Returns consistent `DbResponse<T>` objects

- `/services/` - Service layer
  - Files named with the pattern `*Service.ts`
  - Contains business logic
  - Uses database layer for data access
  - Returns consistent `ServiceResponse<T>` objects

- `/git/` - Git provider APIs
  - Files named with the pattern `*Api.ts`
  - Contains API clients for different Git providers (GitHub, GitLab, Gitea)

- `/utils/` - Utility functions
  - Files named with the pattern `*Utils.ts`
  - Contains reusable helper functions

- `/config/` - Configuration
  - Files named with the pattern `*Config.ts`
  - Contains configuration settings and constants

- `/supabase/` - Supabase-specific functionality
  - Contains Supabase client initialization, authentication, etc.

## Usage Examples

### Database Layer

```typescript
import { getUserById } from '@/lib/db/userDb';

// Database functions return DbResponse objects
const response = await getUserById('user-123');
if (response.success) {
  // Use response.data
} else {
  // Handle response.error
}
```

### Service Layer

```typescript
import { userService } from '@/lib/services/userService';

// Service functions return ServiceResponse objects
const response = await userService.getUserProfile('user-123');
if (response.success) {
  // Use response.data
} else {
  // Handle response.error
}
```

### Git APIs

```typescript
import { githubApi } from '@/lib/git/githubApi';

// Use Git provider APIs
const repositories = await githubApi.getRepositories('orgName');
```

### Utilities

```typescript
import { formatDate } from '@/lib/utils/dateUtils';

// Use utility functions
const formattedDate = formatDate(new Date(), 'YYYY-MM-DD');
```

## Response Types

### DbResponse

Database layer functions return `DbResponse<T>` objects:

```typescript
interface DbResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
}
```

### ServiceResponse

Service layer functions return `ServiceResponse<T>` objects:

```typescript
interface ServiceResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
}
```

## Importing

Always import specific functions from their respective modules:

```typescript
// Good
import { getUser } from '@/lib/db/userDb';
import { formatDate } from '@/lib/utils/dateUtils';

// Bad - avoid importing entire modules
import * as userDb from '@/lib/db/userDb';
```

For convenience, you can also import from the main library export:

```typescript
import { getUser, formatDate } from '@/lib';
```