# Refactoring Summary Report

_Generated on 2/27/2025, 10:15:06 PM_

## Overview

| Issue Type          | Count   |
| ------------------- | ------- |
| Naming Convention   | 47      |
| Location Convention | 194     |
| File Size           | 10      |
| Multiple Issues     | 56      |
| **Total Issues**    | **251** |

## Top Naming Issues (10 of 47)

| File                                          | Suggested Name      |
| --------------------------------------------- | ------------------- |
| src/app/[locale]/components/features.tsx      | features.tsx        |
| src/app/[locale]/components/hero.tsx          | hero.tsx            |
| src/components/coming-soon.tsx                | ComingSoon.tsx      |
| src/components/command-menu.tsx               | CommandMenu.tsx     |
| src/components/common/PinInput/context.tsx    | PinInputContext.tsx |
| src/components/common/PinInput/index.tsx      | PinInputIndex.tsx   |
| src/components/common/PinInput/types.ts       | PinInputTypes.ts    |
| src/components/common/PinInput/usePinInput.ts | usePinInput.ts      |
| src/components/common/PinInput/utils.ts       | PinInputUtils.ts    |
| src/components/confirm-dialog.tsx             | ConfirmDialog.tsx   |

_...and 37 more naming issues._

## Top Location Issues (10 of 194)

| File                                         | Suggested Location                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| src/.DS_Store                                | Move to correct location                                                                                                     |
| src/app/.DS_Store                            | Move to correct location                                                                                                     |
| src/app/[locale]/(auth)/layout.tsx           | Move to correct location                                                                                                     |
| src/app/[locale]/(auth)/login/page.tsx       | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |
| src/app/[locale]/(auth)/signup/page.tsx      | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |
| src/app/[locale]/(marketing)/layout.tsx      | Move to correct location                                                                                                     |
| src/app/[locale]/.DS_Store                   | Move to correct location                                                                                                     |
| src/app/[locale]/[tenant]/.DS_Store          | Move to correct location                                                                                                     |
| src/app/[locale]/[tenant]/billing/page.tsx   | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |
| src/app/[locale]/[tenant]/dashboard/page.tsx | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |

_...and 184 more location issues._

## Top Size Issues (10 of 10)

| File                                                                     | Lines |
| ------------------------------------------------------------------------ | ----- |
| src/server/api/auth/controller.ts                                        | 779   |
| src/components/ui/sidebar.tsx                                            | 776   |
| src/app/[locale]/[tenant]/development/projects/page.tsx                  | 431   |
| src/app/[locale]/[tenant]/hosts/page.tsx                                 | 385   |
| src/app/[locale]/[tenant]/development/usecases/edit/[useCaseId]/page.tsx | 381   |
| src/app/[locale]/[tenant]/virtualization/page.tsx                        | 380   |
| src/components/virtualization/Overview/ConnectionForm.tsx                | 370   |
| src/components/virtualization/Terminal.tsx                               | 367   |
| src/components/virtualization/Overview/ConnectForm.tsx                   | 363   |
| src/app/[locale]/[tenant]/development/usecases/page.tsx                  | 322   |

## Files with Multiple Issues (10 of 56)

| File                                                                     | Type      | Lines | Issues           |
| ------------------------------------------------------------------------ | --------- | ----- | ---------------- |
| src/app/[locale]/[tenant]/development/projects/page.tsx                  | page      | 431   | location, size   |
| src/app/[locale]/[tenant]/development/usecases/edit/[useCaseId]/page.tsx | page      | 381   | location, size   |
| src/app/[locale]/[tenant]/development/usecases/page.tsx                  | page      | 322   | location, size   |
| src/app/[locale]/[tenant]/hosts/page.tsx                                 | page      | 385   | location, size   |
| src/app/[locale]/[tenant]/virtualization/page.tsx                        | page      | 380   | location, size   |
| src/app/[locale]/components/features.tsx                                 | component | 72    | naming, location |
| src/app/[locale]/components/hero.tsx                                     | component | 43    | naming, location |
| src/components/coming-soon.tsx                                           | component | 17    | naming, location |
| src/components/command-menu.tsx                                          | component | 92    | naming, location |
| src/components/common/PinInput/context.tsx                               | component | 3     | naming, location |

_...and 46 more files with multiple issues._

## Refactoring Strategy

1. **Quick Fixes (Naming & Location)**

   - Fix naming convention issues first
   - Then address location issues
   - Commit after each batch of similar changes

2. **Complex Refactoring (File Size)**

   - Tackle one file at a time
   - Test thoroughly after each refactor
   - Commit after each file refactor

3. **General Rules**
   - Maximum 3 retries per task
   - Commit frequently
   - Run tests after significant changes

_For detailed reports, see:_

- [Naming & Location Issues](./refactor/refactor-result-naming-location.md)
- [Size Issues](./refactor/refactor-result-size.md)
