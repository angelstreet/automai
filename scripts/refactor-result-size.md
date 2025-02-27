# Files to Break Down

_Generated on 2/27/2025, 9:46:31 PM_

## File Size Issues (4)

### /Users/joachimndoye/Documents/automai/src/components/ui/sidebar.tsx (776 lines)
- **Issue**: File exceeds 300 lines (776 lines)
- **Fix**: Review the file's purpose and split based on logical concerns. See 'Refactoring Guidelines' for specific patterns.

### /Users/joachimndoye/Documents/automai/src/components/virtualization/Overview/ConnectForm.tsx (363 lines)
- **Issue**: File exceeds 300 lines (363 lines)
- **Fix**: Create a directory with the component name, use index.tsx as the main component, and extract child components into the same directory. See 'Refactoring Guidelines: Components'.

### /Users/joachimndoye/Documents/automai/src/components/virtualization/Overview/ConnectionForm.tsx (370 lines)
- **Issue**: File exceeds 300 lines (370 lines)
- **Fix**: Create a directory with the component name, use index.tsx as the main component, and extract child components into the same directory. See 'Refactoring Guidelines: Components'.

### /Users/joachimndoye/Documents/automai/src/components/virtualization/Terminal.tsx (367 lines)
- **Issue**: File exceeds 300 lines (367 lines)
- **Fix**: Create a directory with the component name, use index.tsx as the main component, and extract child components into the same directory. See 'Refactoring Guidelines: Components'.


## Refactoring Strategy

1. **Quick Fixes (Naming & Location)**
   - Fix naming convention issues first
   - Then address location issues
   - Commit after each batch of similar changes

2. **Complex Refactoring (File Size)**
   - Tackle one file at a time
   - Follow the directory structure in component-organization-plan.md
   - Test thoroughly after each refactor
   - Commit after each file refactor

## General Rules

1. **Maximum Retries: 3**
   - Do not retry the same task more than 3 times
   - If you encounter persistent issues after 3 attempts, seek help
2. **Commit frequently** to avoid large, complex changes
3. **Run tests** after each significant change
