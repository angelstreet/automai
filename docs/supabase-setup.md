# Supabase Database Setup

This document outlines how to set up and work with the Supabase database for the AutomAI application.

## Overview

AutomAI uses Supabase as its database provider. Supabase provides:

- PostgreSQL database
- Auth services
- Storage
- Realtime subscriptions
- RESTful API

## Local Development Setup

### Prerequisites

- Docker Desktop installed and running
- Node.js 18+ installed

### Starting the Database

Simply run the development server:

```bash
npm run dev
```

This automatically:
1. Starts Supabase services
2. Applies the database schema
3. Generates TypeScript types
4. Starts the application

### Required Environment Variables (`.env.development`)

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### Accessing the Local Supabase Dashboard

While Supabase is running, access the dashboard at:

```
http://localhost:54323
```

This provides access to:
- Database tables and data
- Authentication settings
- Storage buckets
- API settings

## Database Schema

The schema is defined in SQL at:

```
/supabase/migrations/fixed-schema.sql
```

Main tables:
- `hosts` - Connected machines
- `tenants` - Organizations
- `users` - User accounts
- `connections` - SSH configurations
- `git_providers` - Git provider settings
- `repositories` - Source code repositories

## Production Setup

1. Create a new project in [Supabase Dashboard](https://app.supabase.com/)

2. Get your project reference ID from the URL

3. Migrate your schema:
   ```bash
   npm run supabase:migrate -- your-project-ref
   ```

4. Update environment variables in `.env.production`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres
   ```

## Using Supabase in Your Code

We've implemented a consistent API for database access:

### Prisma-like Interface

```typescript
// Main import for database operations
import db from '@/lib/db';

// Query examples
const users = await db.user.findMany({
  where: { role: 'admin' }
});

const user = await db.user.findUnique({
  where: { email: 'user@example.com' }
});

const newUser = await db.user.create({
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user'
  }
});

await db.user.update({
  where: { id: '123' },
  data: { role: 'admin' }
});

await db.user.delete({
  where: { id: '123' }
});
```

### Direct Supabase Access

For more advanced queries:

```typescript
import supabase from '@/lib/supabase';

// Select with joins
const { data, error } = await supabase
  .from('users')
  .select(`
    id, 
    name, 
    email, 
    tenant:tenantId (id, name)
  `)
  .eq('role', 'admin');

// Insert with returning
const { data, error } = await supabase
  .from('users')
  .insert({
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'user'
  })
  .select()
  .single();
```

## Schema Management

### Modifying the Schema

1. Edit the SQL schema at `/supabase/migrations/fixed-schema.sql`
2. Apply changes locally:
   ```bash
   # First, ensure Supabase is running
   npm run supabase:start

   # Apply schema changes
   PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/fixed-schema.sql

   # Regenerate types
   npm run supabase:gen-types
   ```
3. To apply to production:
   ```bash
   npm run supabase:migrate -- your-project-ref
   ```

## Row Level Security (RLS)

Supabase uses PostgreSQL's Row Level Security for access control. Our schema includes these policies:

- Users can only view/edit their own data
- Team/tenant members can view shared resources
- Service roles have full access

## Authentication

For authentication setup:

1. In the Supabase Dashboard, go to Authentication → Providers
2. Configure OAuth providers (Google, GitHub)
3. Set redirect URLs for your environments

## Troubleshooting

### Common Issues

1. **Docker Issues**
   - Ensure Docker Desktop is running
   - Try restarting Docker if services won't start

2. **Database Errors**
   - If tables are missing: Apply schema manually
   - Connection issues: Check environment variables

3. **Authentication Problems**
   - Verify authorization callback URLs are correct
   - Check redirect URLs in Supabase dashboard

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)