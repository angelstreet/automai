# Project Organization

This document outlines the organization, structure, and standards for the AutomAI project.

## Directory Structure

The AutomAI project follows a standard Next.js App Router structure with organization for multi-tenant support:

```
/src
  /app                       # Next.js App Router
    /[locale]                # Internationalization wrapper
      /(auth)                # Auth-related route group
        /login
        /signup
      /(marketing)           # Marketing route group
        /_components         # Page-specific components
        /page.tsx            # Home/landing page
      /[tenant]              # Dynamic tenant routes
        /dashboard           # Main dashboard
        /deployment          # Deployment management
        /development         # Development tools
        /hosts               # Host management
        /repositories        # Repository management
        /usecases            # Use case management
      /api                   # API routes
  /components                # Shared components
    /auth                    # Authentication components
    /common                  # Common UI elements
    /layout                  # Layout components
    /shadcn                  # Shadcn UI components
  /lib                       # Core utility functions and services
    /api                     # API utility functions
    /services                # Service layer
    /utils                   # General utilities
  /hooks                     # React hooks
  /context                   # React context providers
  /types                     # TypeScript type definitions
/prisma                      # Prisma ORM configuration
/public                      # Static assets
/docs                        # Documentation
  /guides                    # User and developer guides
  /api                       # API documentation
  /architecture              # Architecture documentation
```

## Naming Conventions

### Components

- Use PascalCase for component files and directories: `Button.tsx`, `UserProfile.tsx`
- Page-specific components go in `_components` folder within the page directory
- Shared components go in `/src/components`

### Files and Functions

- Use camelCase for non-component files: `utils.ts`, `useAuth.ts`
- Use camelCase for functions: `fetchData()`, `formatDate()`
- Use PascalCase for types and interfaces: `UserData`, `ApiResponse`

### Routes and APIs

- Use kebab-case for API routes: `/api/auth/reset-password`
- Use descriptive names that reflect the resource or action

## Code Organization Principles

### Component Organization

1. **Page-specific components**:

   - Located in `_components` folder within the page directory
   - Only used within that specific page or its children

2. **Shared components**:

   - Located in `/src/components`
   - Categorized by purpose (auth, layout, ui, etc.)
   - Should be reusable across multiple pages

3. **Component Structure**:
   - Each component should have a single responsibility
   - Keep components under 300 lines
   - Extract complex logic to custom hooks
   - Use TypeScript interfaces for props

### State Management

- Use React Context for global state
- Use React Query for server state
- Use local state (useState) for component-specific state
- Prefer prop drilling for shallow component trees

### API Structure

- RESTful design principles
- Organized by resource
- Consistent response formats
- Error handling through status codes and messages

## Coding Standards

### TypeScript

- Use strict type checking
- Define interfaces for all data structures
- Avoid `any` type
- Use type guards for runtime type checking

### React

- Use functional components
- Use hooks for state and side effects
- Break down large components into smaller ones
- Add meaningful comments for complex logic
- Follow the React component lifecycle

### CSS/Styling

- Use Tailwind CSS for styling
- Use CSS modules for component-specific styles
- Follow responsive design principles
- Maintain a consistent UI across the application

## Documentation Standards

- Keep documentation up-to-date
- Document all APIs with examples
- Include setup instructions for new developers
- Document architectural decisions
- Use markdown for all documentation

## Testing

- Write unit tests for utility functions
- Write component tests for UI components
- Write integration tests for critical paths
- Use mock services for external dependencies

## Version Control

- Use feature branches
- Write descriptive commit messages
- Pull requests for all changes
- Code review before merging
