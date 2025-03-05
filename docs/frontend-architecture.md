# Frontend Architecture

This document outlines the frontend architecture and component organization for the AutomAI application.

## Overview

The frontend is built with **Next.js + TypeScript**, designed to handle:

- **Project & Test Case Management** (CRUD Operations, Git Versioning)
- **Test Execution UI** (Live Execution Table, Logs, Screenshots, Videos)
- **Reporting and Analytics** (Performance metrics, pass/fail rates)
- **Authentication & Multi-Tenant Support**

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **State Management:** React Context API
- **Styling:** Tailwind CSS, shadcn/ui
- **Authentication:** NextAuth.js (JWT, OAuth)
- **Data Fetching:** React Query / SWR
- **Form Handling:** React Hook Form + Zod
- **Testing:** Jest, React Testing Library

## Component Organization

### Directory Structure

```
/src
  /app                     # Next.js App Router
    /[locale]              # Internationalization wrapper
      /page.tsx            # Landing page
      /(marketing)         # Marketing pages (route group)
        /_components       # Page-specific components
      /(auth)              # Auth pages (route group)
        /login
        /signup
      /[tenant]            # Dynamic tenant routes
        /dashboard
        /_components       # Dashboard-specific components
  /components              # Shared components
    /auth                  # Authentication components
    /common                # Common UI elements
    /layout                # Layout components
    /shadcn                # shadcn/ui components
```

### Component Types

1. **Page Components**
   - Defined in `page.tsx` files
   - Responsible for data fetching and layout
   - Act as containers for other components

2. **Layout Components**
   - Defined in `layout.tsx` files
   - Provide structure for pages
   - Include navigation, sidebars, and other persistent UI elements

3. **Page-Specific Components**
   - Located in `_components` folders
   - Used only within specific page(s)
   - Not intended for reuse across different sections

4. **Shared Components**
   - Located in `/src/components`
   - Reusable across the application
   - Organized by category or purpose

### Component Naming and Structure

- Use PascalCase for component files: `Button.tsx`, `UserProfile.tsx`
- Group related components in folders
- Keep components focused on a single responsibility
- Limit component size (< 300 lines of code)

## State Management

### Local State

Use React's useState hook for component-specific state:

```tsx
const [isLoading, setIsLoading] = useState(false);
```

### Context API

Use React Context for global state:

```tsx
// /src/context/UserContext.tsx
import { createContext, useContext, useState } from 'react';

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
```

### Server State

Use React Query or SWR for server state:

```tsx
// Using React Query
const { data, isLoading, error } = useQuery('projects', fetchProjects);

// Using SWR
const { data, error } = useSWR('/api/projects', fetcher);
```

## UI Components

### UI Component Library (shadcn/ui)

The application uses shadcn/ui for consistent design:

```tsx
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';

function LoginForm() {
  return (
    <form>
      <Input 
        type="email" 
        placeholder="Email" 
      />
      <Button type="submit">
        Login
      </Button>
    </form>
  );
}
```

### Responsive Design

All components should be responsive using Tailwind's responsive modifiers:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

## Data Fetching

### Route Handlers

Use Next.js Route Handlers for API endpoints:

```tsx
// /src/app/api/projects/route.ts
export async function GET(request: Request) {
  const projects = await prisma.project.findMany();
  return Response.json({ projects });
}
```

### Client-Side Data Fetching

For client components, use React Query or SWR:

```tsx
'use client';

import { useQuery } from 'react-query';

function ProjectList() {
  const { data, isLoading, error } = useQuery('projects', async () => {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  });

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {data.projects.map(project => (
        <li key={project.id}>{project.name}</li>
      ))}
    </ul>
  );
}
```

### Server Components

For server components, fetch data directly:

```tsx
// /src/app/[tenant]/dashboard/page.tsx
async function DashboardPage({ params }) {
  const { tenant } = params;
  const projects = await prisma.project.findMany({
    where: { tenantId: tenant },
  });

  return (
    <div>
      <h1>Dashboard</h1>
      <ProjectList projects={projects} />
    </div>
  );
}
```

## Form Handling

Use React Hook Form with Zod for form validation:

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type FormValues = z.infer<typeof schema>;

function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    // Submit form data
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      
      <Input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

## Authentication and Authorization

Use NextAuth.js for authentication:

```tsx
'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

function Header() {
  const { data: session } = useSession();

  return (
    <header>
      {session ? (
        <Button onClick={() => signOut()}>Sign Out</Button>
      ) : (
        <Button onClick={() => signIn()}>Sign In</Button>
      )}
    </header>
  );
}
```

## Error Handling

### Error Boundaries

Use error boundaries to catch and display errors:

```tsx
'use client';

import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Component />
    </ErrorBoundary>
  );
}
```

### Error Pages

Create error pages for different error types:

```tsx
// /src/app/error.tsx
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

## Internationalization

Use next-intl for internationalization:

```tsx
// /src/app/[locale]/page.tsx
import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('Home');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

## Testing

Use Jest and React Testing Library for component testing:

```tsx
// /src/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Performance Optimization

### Code Splitting

Next.js handles code splitting automatically for pages, but you can also use dynamic imports:

```tsx
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('@/components/Heavy'), {
  loading: () => <p>Loading...</p>,
});
```

### Memoization

Use React.memo, useMemo, and useCallback for performance optimization:

```tsx
import { useMemo, useCallback } from 'react';

function ExpensiveComponent({ data, onItemClick }) {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: doExpensiveOperation(item),
    }));
  }, [data]);

  // Memoize callback functions
  const handleItemClick = useCallback((id) => {
    onItemClick(id);
  }, [onItemClick]);

  return (
    <ul>
      {processedData.map(item => (
        <li key={item.id} onClick={() => handleItemClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(ExpensiveComponent);
```

## Accessibility

Follow these accessibility guidelines:

1. Use semantic HTML elements
2. Include proper ARIA attributes
3. Ensure keyboard navigation
4. Maintain sufficient color contrast
5. Provide alternative text for images

Example:

```tsx
function Accordion({ items }) {
  return (
    <div className="accordion" role="region" aria-label="Accordion">
      {items.map((item, index) => (
        <div key={index}>
          <button
            id={`accordion-header-${index}`}
            aria-expanded={item.isOpen}
            aria-controls={`accordion-panel-${index}`}
            onClick={() => toggleItem(index)}
          >
            {item.title}
          </button>
          <div
            id={`accordion-panel-${index}`}
            role="region"
            aria-labelledby={`accordion-header-${index}`}
            hidden={!item.isOpen}
          >
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

1. **Code Organization**
   - Keep components small and focused
   - Use consistent naming conventions
   - Follow the project's directory structure

2. **Performance**
   - Minimize component re-renders
   - Use appropriate data fetching strategies
   - Optimize images and assets

3. **Accessibility**
   - Ensure all components are accessible
   - Test with keyboard navigation
   - Use semantic HTML

4. **Testing**
   - Write unit tests for components
   - Test important user flows
   - Ensure good test coverage

5. **Documentation**
   - Document component props with JSDoc
   - Include usage examples
   - Explain complex logic or edge cases