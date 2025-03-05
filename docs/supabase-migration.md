# Migrating from Prisma to Supabase

This document outlines the steps needed to fully migrate from using Prisma with direct PostgreSQL access to using Supabase's data API.

## Migration Steps

### 1. Export Schema from Prisma to SQL

Generate SQL migration scripts from your Prisma schema:

```bash
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-empty \
  --script > supabase-migration.sql
```

### 2. Create Tables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Paste and run the migration SQL script
4. Make necessary adjustments for Supabase-specific features

### 3. Update Data Access in the Application

The current implementation in `src/lib/prisma.ts` provides a stub client that allows the application to start without direct PostgreSQL access, but it doesn't fully implement the data operations.

To complete the migration:

1. Implement each model's operations in `src/lib/services/supabase-data.ts`
2. Update the stub client in `src/lib/prisma.ts` to use these implementations
3. Test each operation to ensure it works correctly

## API Comparison

### Prisma vs Supabase Data API

| Prisma Operation | Supabase Equivalent                                                  |
| ---------------- | -------------------------------------------------------------------- |
| `findMany`       | `supabase.from('table').select('*')`                                 |
| `findUnique`     | `supabase.from('table').select('*').match({ id }).single()`          |
| `create`         | `supabase.from('table').insert(data).select().single()`              |
| `update`         | `supabase.from('table').update(data).match(where).select().single()` |
| `delete`         | `supabase.from('table').delete().match(where).select().single()`     |

### Special Considerations

1. **Relationships**: Prisma automatically handles relationships, while in Supabase you need to use `.select()` with the appropriate syntax:

   ```js
   // Getting related data in Supabase
   const { data } = await supabase.from('users').select(`
       id, 
       name,
       posts (id, title, content)
     `);
   ```

2. **Transactions**: Prisma's transaction API needs to be replaced with RPC functions in Supabase

3. **Migrations**: You'll need to manage schema migrations manually or through Supabase's interface

## Resources

- [Supabase Documentation](https://supabase.io/docs)
- [Prisma to Supabase Migration Guide](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Data API Reference](https://supabase.com/docs/reference/javascript/select)
