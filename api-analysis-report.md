# API Routes Analysis Report

Generated on: 3/31/2025, 9:28:38 AM

## Summary

- Total API Routes: 13
- Unused API Routes: 11
- Rarely Used API Routes (1-2 references): 1
- Frequently Used API Routes (3+ references): 1
- Total Server Actions: 88
- Server - Server Actions that could replace API Routes: 21

## Unused API Routes

These API routes have no references in the codebase and are candidates for removal:

| Route | File Path | HTTP Methods | Last Modified | Size (bytes) | Complexity |
|-------|-----------|--------------|---------------|--------------|------------|
| /auth/cors | src/app/api/auth/cors/route.ts | POST, OPTIONS | 3/31/2025 | 6022 | 9/10 |
| /deployments/:id | src/app/api/deployments/[id]/route.ts | GET, PATCH, DELETE | 3/31/2025 | 3829 | 6/10 |
| /git-providers/:id | src/app/api/git-providers/[id]/route.ts | GET, DELETE | 3/31/2025 | 1564 | 3/10 |
| /git-providers/callback | src/app/api/git-providers/callback/route.ts | GET | 3/31/2025 | 1467 | 3/10 |
| /git-providers | src/app/api/git-providers/route.ts | GET, POST | 3/31/2025 | 1962 | 4/10 |
| /repositories/explore | src/app/api/repositories/explore/route.ts | GET | 3/31/2025 | 13869 | 10/10 |
| /repositories/sync/:id | src/app/api/repositories/sync/[id]/route.ts | POST | 3/31/2025 | 825 | 2/10 |
| /repositories/test-connection | src/app/api/repositories/test-connection/route.ts | POST | 3/31/2025 | 943 | 2/10 |
| /repositories/verify | src/app/api/repositories/verify/route.ts | POST | 3/31/2025 | 3151 | 5/10 |
| /terminals/:id | src/app/api/terminals/[id]/route.ts | GET | 3/31/2025 | 2772 | 5/10 |
| /terminals/ws/:id | src/app/api/terminals/ws/[id]/route.ts | GET | 3/31/2025 | 978 | 2/10 |

## Rarely Used API Routes (1-2 references)

These API routes have few references and might be candidates for consolidation:

### /terminals/init (1 references)

- **File:** src/app/api/terminals/init/route.ts
- **HTTP Methods:** POST
- **Last Modified:** 3/12/2025
- **Size:** 1293 bytes
- **Complexity:** 2/10

**Referenced in:**

- src/app/[locale]/[tenant]/terminals/_components/Terminal.tsx

## Frequently Used API Routes (3+ references)

These API routes are frequently used in the codebase:

| Route | File Path | HTTP Methods | References | Last Modified | Size (bytes) |
|-------|-----------|--------------|------------|---------------|------------|
| /repositories | src/app/api/repositories/route.ts | GET, POST | 3 | 3/31/2025 | 2758 |

## Server Actions that could replace API Routes

These server actions have similar functionality to existing API routes:

### signInWithOAuth

- **File:** src/app/actions/auth.ts
- **References:** 1
- **Last Modified:** 3/31/2025
- **Size:** 1124 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### handleAuthCallback

- **File:** src/app/actions/auth.ts
- **References:** 0
- **Last Modified:** 3/31/2025
- **Size:** 1918 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### signUp

- **File:** src/app/actions/auth.ts
- **References:** 1
- **Last Modified:** 3/31/2025
- **Size:** 595 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### signInWithPassword

- **File:** src/app/actions/auth.ts
- **References:** 4
- **Last Modified:** 3/31/2025
- **Size:** 675 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### resetPasswordForEmail

- **File:** src/app/actions/auth.ts
- **References:** 3
- **Last Modified:** 3/31/2025
- **Size:** 426 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### signOut

- **File:** src/app/actions/auth.ts
- **References:** 10
- **Last Modified:** 3/31/2025
- **Size:** 1576 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### exchangeCodeForSession

- **File:** src/app/actions/auth.ts
- **References:** 2
- **Last Modified:** 3/31/2025
- **Size:** 95 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### handleAuthWithEmail

- **File:** src/app/actions/auth.ts
- **References:** 0
- **Last Modified:** 3/31/2025
- **Size:** 1561 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### testCICDProvider

- **File:** src/app/actions/cicd.ts
- **References:** 2
- **Last Modified:** 3/31/2025
- **Size:** 2230 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)
- /repositories/verify (0 references)

### testJenkinsAPI

- **File:** src/app/actions/cicd.ts
- **References:** 0
- **Last Modified:** 3/31/2025
- **Size:** 1929 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### startDeployment

- **File:** src/app/actions/deploymentWizard.ts
- **References:** 4
- **Last Modified:** 3/31/2025
- **Size:** 1151 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### getRepositories

- **File:** src/app/actions/repositories.ts
- **References:** 8
- **Last Modified:** 3/31/2025
- **Size:** 136 bytes

**Could replace these API routes:**

- /repositories (3 references)

### syncRepository

- **File:** src/app/actions/repositories.ts
- **References:** 2
- **Last Modified:** 3/31/2025
- **Size:** 144 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### refreshGitProvider

- **File:** src/app/actions/repositories.ts
- **References:** 1
- **Last Modified:** 3/31/2025
- **Size:** 884 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### handleOAuthCallback

- **File:** src/app/actions/repositories.ts
- **References:** 4
- **Last Modified:** 3/31/2025
- **Size:** 145 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### getAllRepositories

- **File:** src/app/actions/repositories.ts
- **References:** 2
- **Last Modified:** 3/31/2025
- **Size:** 172 bytes

**Could replace these API routes:**

- /repositories (3 references)

### clearRepositoriesCache

- **File:** src/app/actions/repositories.ts
- **References:** 2
- **Last Modified:** 3/31/2025
- **Size:** 98 bytes

**Could replace these API routes:**

- /repositories (3 references)

### assignResourceToTeam

- **File:** src/app/actions/team.ts
- **References:** 2
- **Last Modified:** 3/31/2025
- **Size:** 989 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### initTerminal

- **File:** src/app/actions/terminals.ts
- **References:** 2
- **Last Modified:** 3/31/2025
- **Size:** 1318 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### closeTerminal

- **File:** src/app/actions/terminals.ts
- **References:** 1
- **Last Modified:** 3/31/2025
- **Size:** 654 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

### sendTerminalData

- **File:** src/app/actions/terminals.ts
- **References:** 0
- **Last Modified:** 3/31/2025
- **Size:** 681 bytes

**Could replace these API routes:**

- /auth/cors (0 references)
- /repositories/explore (0 references)

## Recommendations

1. Consider removing or archiving these unused API routes:
   - /auth/cors (src/app/api/auth/cors/route.ts)
   - /deployments/:id (src/app/api/deployments/[id]/route.ts)
   - /git-providers/:id (src/app/api/git-providers/[id]/route.ts)
   - /git-providers/callback (src/app/api/git-providers/callback/route.ts)
   - /git-providers (src/app/api/git-providers/route.ts)
   - ...and 6 more

2. Consider replacing these API routes with equivalent server actions:
   - Replace /auth/cors with server action signInWithOAuth
   - Replace /auth/cors with server action handleAuthCallback
   - Replace /auth/cors with server action signUp
   - Replace /auth/cors with server action signInWithPassword
   - Replace /auth/cors with server action resetPasswordForEmail
   - ...and 16 more

3. For any API routes you want to keep, consider adding more comprehensive documentation.

4. Update your client-side code to use server actions where appropriate, replacing fetch calls to API routes.

5. Consider implementing a migration strategy for transitioning from API routes to server actions over time.

## Appendix: All API Routes

| Route | HTTP Methods | References | Last Modified | Size | Complexity |
|-------|--------------|------------|---------------|------|------------|
| /auth/cors | POST, OPTIONS | 0 | 3/31/2025 | 6022 | 9/10 |
| /deployments/:id | GET, PATCH, DELETE | 0 | 3/31/2025 | 3829 | 6/10 |
| /git-providers | GET, POST | 0 | 3/31/2025 | 1962 | 4/10 |
| /git-providers/:id | GET, DELETE | 0 | 3/31/2025 | 1564 | 3/10 |
| /git-providers/callback | GET | 0 | 3/31/2025 | 1467 | 3/10 |
| /repositories | GET, POST | 3 | 3/31/2025 | 2758 | 5/10 |
| /repositories/explore | GET | 0 | 3/31/2025 | 13869 | 10/10 |
| /repositories/sync/:id | POST | 0 | 3/31/2025 | 825 | 2/10 |
| /repositories/test-connection | POST | 0 | 3/31/2025 | 943 | 2/10 |
| /repositories/verify | POST | 0 | 3/31/2025 | 3151 | 5/10 |
| /terminals/:id | GET | 0 | 3/31/2025 | 2772 | 5/10 |
| /terminals/init | POST | 1 | 3/12/2025 | 1293 | 2/10 |
| /terminals/ws/:id | GET | 0 | 3/31/2025 | 978 | 2/10 |
