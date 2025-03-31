# Types Migration Guide

This document outlines the steps for migrating to the new types organization structure.

## What We've Accomplished

1. Created a new, structured types organization:

   - `src/types/core/` - Core entity types
   - `src/types/auth/` - Authentication types
   - `src/types/api/` - API types
   - `src/types/context/` - Context types
   - `src/types/db/` - Database types
   - `src/types/ui/` - UI-specific types

2. Consolidated duplicate types:

   - Merged multiple `Host` interfaces into a single source of truth
   - Unified Git provider types with shared base interfaces
   - Organized authentication and user types logically

3. Set up transition mechanisms:
   - Created re-export files to maintain backward compatibility
   - Added an update script to help migrate imports
   - Documented the new structure in README.md

## Migration Roadmap

### Phase 1: Setup and Structure (✅ Completed)

- Created folder structure
- Defined consolidated types
- Set up backward compatibility

### Phase 2: Progressive Import Updates (Current)

1. Run the update script for one module at a time:
   ```bash
   node scripts/update-type-imports.js
   ```
2. Test the affected module thoroughly
3. Commit changes before moving to the next module

### Phase 3: Clean Up (Future)

1. After all imports have been updated, remove temporary re-export files
2. Remove `-new` suffix from transitional files
3. Update the main index.ts to finalize the structure

## How to Update Your Code

### Option 1: Automatic Update (Recommended)

Use the provided script to update imports:

```bash
# Update all imports
node scripts/update-type-imports.js

# Test your changes thoroughly
npm run test
```

### Option 2: Manual Updates

If you're working on a specific file:

1. Check the README for the new location of types
2. Update your imports to use the new paths
3. Test to ensure everything works correctly

### When Creating New Types

1. Add new types to the appropriate location based on their domain
2. Follow the naming conventions in the README
3. Document with JSDoc comments
4. Export from index.ts if commonly used

## Migration Timeline

- **Week 1-2**: Update core modules (host, deployment)
- **Week 3-4**: Update all other modules
- **Week 5**: Clean up and finalize

## Need Help?

If you encounter issues during migration:

1. Check the README.md for guidance
2. Review this migration guide for best practices
3. Reach out to the project tech lead for assistance
