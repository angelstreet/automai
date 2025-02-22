Apologies for the mix-up—I'll stick with "Test Case" as the terminology. Below is the **Design Document** and **Instructions for the AI Agent** specifically for the **Test Cases Listing Page**, based on your improved artifact, without touching the edit page yet. This focuses solely on listing test cases grouped by project, with sorting, favorites, search, and modals for creation and details, integrated with your backend.

---

### Design Document: Test Cases Listing Page

#### Page Location
- `/[locale]/[tenant]/development/usecases`

#### Purpose
- Display all test cases grouped by project in an accordion layout.
- Allow users to view details, edit (redirects to edit page), or create new test cases (modal → redirect).
- Enhance usability with search, sorting, favorites, and a detailed test case modal.

#### Layout
| **Section**         | **Description**                                                                 | **Components**                     |
|---------------------|--------------------------------------------------------------------------------|------------------------------------|
| **Header**          | Search bar and "New" button                                                   | `<Input>`, `<Button>` (shadcn-ui)  |
| **Main Content**    | Favorites section (if any) + Accordion of projects with test case tables       | `<Accordion>` (shadcn-ui)          |
| **Modal (Create)**  | Form to select project and enter test case name                                | Custom modal                       |
| **Modal (Test Case)**| Detailed view of selected test case with actions (Edit, Delete, Close)         | Custom modal                       |

#### Accordion Structure
- **Favorites Section**: Appears if test cases are favorited, showing a table of favorite test cases.
- **Project Accordion**:
  | **Level**          | **Description**                   | **Interactivity**                  |
  |--------------------|-----------------------------------|-------------------------------------|
  | **Project Header** | Project name and test case count   | Expands/collapses accordion        |
  | **Test Case Table** | Columns: ID, Name, Platform, Status, Modified | Sortable headers, clickable rows  |
  | **Empty State** | Message and "Create" button when no test cases | Direct link to create dialog |

#### Test Case Table Columns
| **Column**       | **Description**                   | **Interactivity**                  | **Backend Mapping**          |
|------------------|-----------------------------------|-------------------------------------|-----------------------------|
| **ID**           | Unique test case ID (e.g., TC-1001)| Sortable                            | `id` from `TestCase`        |
| **Name**         | Test case name with favorite star  | Sortable, shows star if favorited   | `name` from `TestCase`      |
| **Platform**     | Icon (🌐, 📱, 💻, 👁️)            | Sortable                            | `steps.platform`            |
| **Status**       | Badge (active, draft, archived)   | Sortable                            | `status` (add to model)     |
| **Modified**     | Last modified date                | Sortable                            | `lastModified` (add to model) |

#### Test Case Modal
- **Fields**: Name, ID, Platform, Status, Created, Last Modified, Author, Tags.
- **Actions**: Favorite toggle, Edit (redirects), Delete, Close.

#### Workflow
1. **User Lands on Page**:
   - Fetches projects from `http://localhost:5001/api/projects` and test cases from `http://localhost:5001/api/testcases`.
   - Displays favorites (if any) and project accordion.
   - Shows empty state with "Create" button for projects with no test cases.
2. **Search**:
   - Filters test cases by ID, name, platform, or tags (client-side initially).
3. **Sort**:
   - Sorts table columns (ID, Name, Platform, Status, Modified) client-side.
4. **Favorite**:
   - Toggles star, updates favorites section dynamically.
5. **Expand Project**:
   - Shows test case table; clicking a row opens a modal.
6. **View Test Case**:
   - Modal shows details; "Edit" redirects to `/[locale]/[tenant]/development/usecases/edit/[useCaseId]`.
7. **Create New Test Case**:
   - "New" → Modal → `POST http://localhost:5001/api/testcases` → Redirects to edit page.

---

### Instructions for AI Agent: Test Cases Listing Page with Backend Integration

#### Prerequisites
- **Dependencies**:
  ```bash
  npm install @supabase/supabase-js
  npx shadcn-ui@latest add button input select accordion
  ```
- **Backend**: Ensure `http://localhost:5001/api/projects` and `http://localhost:5001/api/testcases` endpoints are functional.
- **Auth**: Use JWT token from localStorage for authentication.
- **File Location**: `src/app/[locale]/[tenant]/development/usecases/page.tsx`.

#### Step 1: Implement Component
```jsx
// See actual implementation in src/app/[locale]/[tenant]/development/usecases/page.tsx
```

#### Step 2: Backend Integration Notes
- **API Calls**:
  - `GET http://localhost:5001/api/projects`: Fetches all projects for the user (filtered by `ownerId` on backend).
  - `GET http://localhost:5001/api/testcases?project_id=[id]`: Fetches test cases per project.
  - `POST http://localhost:5001/api/testcases`: Creates a new test case with `projectId`, `name`, and default `steps`.
  - `DELETE http://localhost:5001/api/testcases/[id]`: Deletes a test case by ID.
  - `POST http://localhost:5001/api/testcases/[id]/favorite`: Toggles favorite status.
  - `DELETE http://localhost:5001/api/testcases/[id]/favorite`: Removes favorite status.
- **Schema Updates**:
  - Update `TestCase` schema:
    ```typescript
    type TestCase = {
      id: string;
      name: string;
      steps: { platform: string; code: string };
      createdAt: string;
      lastModified?: string;
      author?: string;
      status?: string;
      tags?: string[];
    };
    ```
- **Favorites**: Implemented with backend endpoints for persistence.
- **Search**: Client-side filtering; extend to server-side later.

#### Step 3: Styling
- Uses Tailwind CSS: `bg-gray-50`, `rounded-lg`, `shadow`, `grid grid-cols-12` for layout consistency.

#### Step 4: Testing
- Add E2E test in `tests/e2e/usecases.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("Test Cases page lists, creates, and deletes", async ({ page }) => {
  await page.goto("/en/tenant/development/usecases");
  await expect(page.locator("text=Project Alpha")).toBeVisible();
  await page.click("text=Project Alpha");
  await expect(page.locator("text=Login Flow")).toBeVisible();

  // Create
  await page.click("text=New");
  await page.selectOption("select", "1");
  await page.fill('input[placeholder="Test Case Name"]', "New Test");
  await page.click("text=Create");
  await expect(page.url()).toContain("/usecases/");

  // Delete
  await page.goto("/en/tenant/development/usecases");
  await page.click("text=Project Alpha");
  await page.click("text=Login Flow");
  await page.click("text=Delete");
  await expect(page.locator("text=Login Flow")).not.toBeVisible();
});
```

---

### Notes
- **Terminology**: Using "Test Case" throughout for consistency.
- **Backend**: Fully integrated with backend APIs running on port 5001.
- **Authentication**: Using JWT token from localStorage for all API requests.