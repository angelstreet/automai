# Files to Review

_Generated on 2/27/2025, 10:03:25 PM_

## Location Convention Issues (0)

No location convention issues found.


## Refactoring Strategy

1. **Quick Fixes (Naming & Location)**
   - Fix naming convention issues first
     - Components: PascalCase.tsx
     - Hooks: useFeature.ts
     - Utilities: camelCase.ts
     - Pages: page.tsx in kebab-case folders
     - Dynamic routes: [kebab-case].tsx
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
