# Refactoring Summary Report

_Generated on 2/28/2025, 7:52:38 PM_

## Overview

| Issue Type          | Count   |
| ------------------- | ------- |
| Naming Convention   | 85      |
| Location Convention | 207     |
| File Size           | 9       |
| Multiple Issues     | 92      |
| **Total Issues**    | **301** |

## Top Naming Issues (10 of 85)

| File                                          | Suggested Name      |
| --------------------------------------------- | ------------------- |
| src/app/[locale]/components/features.tsx      | features.tsx        |
| src/app/[locale]/components/hero.tsx          | hero.tsx            |
| src/app/api/auth/[...nextauth]/auth.config.ts | auth.config.ts      |
| src/components/coming-soon.tsx                | ComingSoon.tsx      |
| src/components/command-menu.tsx               | CommandMenu.tsx     |
| src/components/common/PinInput/context.tsx    | PinInputContext.tsx |
| src/components/common/PinInput/index.tsx      | PinInputIndex.tsx   |
| src/components/common/PinInput/types.ts       | PinInputTypes.ts    |
| src/components/common/PinInput/usePinInput.ts | usePinInput.ts      |
| src/components/common/PinInput/utils.ts       | PinInputUtils.ts    |

_...and 75 more naming issues._

## Top Location Issues (10 of 207)

| File                                                                     | Suggested Location                                                                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| src/app/[locale]/(auth)/layout.tsx                                       | Move to correct location                                                                                                     |
| src/app/[locale]/(auth)/login/page.tsx                                   | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |
| src/app/[locale]/(auth)/signup/page.tsx                                  | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |
| src/app/[locale]/(marketing)/layout.tsx                                  | Move to correct location                                                                                                     |
| src/app/[locale]/[tenant]/billing/page.tsx                               | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |
| src/app/[locale]/[tenant]/dashboard/page.tsx                             | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |
| src/app/[locale]/[tenant]/development/projects/page.tsx                  | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |
| src/app/[locale]/[tenant]/development/usecases/edit/[useCaseId]/page.tsx | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |
| src/app/[locale]/[tenant]/development/usecases/page.tsx                  | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |
| src/app/[locale]/[tenant]/devices/page.tsx                               | Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions |

_...and 197 more location issues._

## Top Size Issues (9 of 9)

| File                                                                     | Lines |
| ------------------------------------------------------------------------ | ----- |
| src/components/shadcn/sidebar.tsx                                        | 749   |
| src/app/[locale]/[tenant]/development/projects/page.tsx                  | 431   |
| src/lib/websocket-server.ts                                              | 407   |
| src/app/[locale]/[tenant]/hosts/page.tsx                                 | 386   |
| src/app/[locale]/[tenant]/development/usecases/edit/[useCaseId]/page.tsx | 381   |
| src/components/hosts/ConnectionForm.tsx                                  | 373   |
| src/components/hosts/Terminal.tsx                                        | 367   |
| src/components/hosts/ConnectForm.tsx                                     | 364   |
| src/app/[locale]/[tenant]/development/usecases/page.tsx                  | 326   |

## Files with Multiple Issues (10 of 92)

| File                                                                     | Type      | Lines | Issues           |
| ------------------------------------------------------------------------ | --------- | ----- | ---------------- |
| src/app/[locale]/[tenant]/development/projects/page.tsx                  | page      | 431   | location, size   |
| src/app/[locale]/[tenant]/development/usecases/edit/[useCaseId]/page.tsx | page      | 381   | location, size   |
| src/app/[locale]/[tenant]/development/usecases/page.tsx                  | page      | 326   | location, size   |
| src/app/[locale]/[tenant]/hosts/page.tsx                                 | page      | 386   | location, size   |
| src/app/[locale]/components/features.tsx                                 | component | 72    | naming, location |
| src/app/[locale]/components/hero.tsx                                     | component | 43    | naming, location |
| src/app/api/auth/[...nextauth]/auth.config.ts                            | type      | 122   | naming, location |
| src/components/coming-soon.tsx                                           | component | 17    | naming, location |
| src/components/command-menu.tsx                                          | component | 92    | naming, location |
| src/components/common/PinInput/context.tsx                               | component | 4     | naming, location |

_...and 82 more files with multiple issues._

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
