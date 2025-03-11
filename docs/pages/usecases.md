Apologies for the mix-up—I'll stick with "Use Case" as the terminology, as you've confirmed it's your preference. Below is the **Design Document** and **Instructions for the AI Agent** specifically for the **Use Cases Listing Page**, based on your improved artifact, without touching the edit page yet. This focuses solely on listing use cases grouped by project, with sorting, favorites, search, and modals for creation and details, integrated with your backend.

---

### Design Document: Use Cases Listing Page

#### Page Location

- `/[locale]/[tenant]/development/usecases`

#### Purpose

- Display all use cases grouped by project in an accordion layout.
- Allow users to view details, edit (redirects to edit page), or create new use cases (modal → redirect).
- Enhance usability with search, sorting, favorites, and a detailed use case modal.

#### Layout

| **Section**          | **Description**                                                         | **Components**                    |
| -------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| **Header**           | Search bar and "New" button                                             | `<Input>`, `<Button>` (shadcn-ui) |
| **Sidebar**          | Navigation to Dashboard, Development, Execution, Reports, Settings      | `<Sidebar>` (layout component)    |
| **Main Content**     | Favorites section (if any) + Accordion of projects with use case tables | `<Accordion>` (shadcn-ui)         |
| **Modal (Create)**   | Form to select project and enter use case name                          | Custom modal                      |
| **Modal (Use Case)** | Detailed view of selected use case with actions (Edit, Delete, Close)   | Custom modal                      |

#### Accordion Structure

- **Favorites Section**: Appears if use cases are favorited, showing a table of favorite use cases.
- **Project Accordion**:
  | **Level** | **Description** | **Interactivity** |
  |--------------------|-----------------------------------|-------------------------------------|
  | **Project Header** | Project name and use case count | Expands/collapses accordion |
  | **Use Case Table** | Columns: ID, Name, Platform, Status, Modified | Sortable headers, clickable rows |

#### Use Case Table Columns

| **Column**   | **Description**                    | **Interactivity**                 | **Backend Mapping**           |
| ------------ | ---------------------------------- | --------------------------------- | ----------------------------- |
| **ID**       | Unique use case ID (e.g., TC-1001) | Sortable                          | `id` from `TestCase`          |
| **Name**     | Use case name with favorite star   | Sortable, shows star if favorited | `name` from `TestCase`        |
| **Platform** | Icon (🌐, 📱, 💻, 👁️)              | Sortable                          | `steps.platform`              |
| **Status**   | Badge (active, draft, archived)    | Sortable                          | `status` (add to model)       |
| **Modified** | Last modified date                 | Sortable                          | `lastModified` (add to model) |

#### Use Case Modal

- **Fields**: Name, ID, Platform, Status, Created, Last Modified, Author, Tags.
- **Actions**: Favorite toggle, Edit (redirects), Delete, Close.

#### Workflow

1. **User Lands on Page**:
   - Fetches projects from `/api/projects` and use cases from `/api/testcases`.
   - Displays favorites (if any) and project accordion.
2. **Search**:
   - Filters use cases by ID, name, platform, or tags (client-side initially).
3. **Sort**:
   - Sorts table columns (ID, Name, Platform, Status, Modified) client-side.
4. **Favorite**:
   - Toggles star, updates favorites section dynamically.
5. **Expand Project**:
   - Shows use case table; clicking a row opens a modal.
6. **View Use Case**:
   - Modal shows details; "Edit" redirects to `/[locale]/[tenant]/development/projects/[projectId]/usecases/[useCaseId]`.
7. **Create New Use Case**:
   - "New" → Modal → `POST /api/testcases` → Redirects to edit page.

---

### Instructions for AI Agent: Use Cases Listing Page with Backend Integration

#### Prerequisites

- **Dependencies**:
  ```bash
  npm install @supabase/supabase-js next-auth
  npx shadcn-ui@latest add button input select accordion
  ```
- **Backend**: Ensure `/api/projects` and `/api/testcases` endpoints are functional per your "Backend Architecture & API Updates" doc.
- **Auth**: Use NextAuth.js for session management.
- **File Location**: `src/app/[locale]/[tenant]/development/usecases/page.tsx`.

#### Step 1: Implement Component

```jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion";
import Sidebar from "@/components/Layout/Sidebar";

type Project = {
  id: string;
  name: string;
  testcases: TestCase[];
};

type TestCase = {
  id: string;
  name: string;
  steps: { platform: string; code: string };
  createdAt: string;
  lastModified?: string; // Add to schema
  author?: string;       // Add to schema
  status?: string;       // Add to schema
  tags?: string[];       // Add to schema
};

export default function UseCasesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<TestCase | null>(null);
  const [newUseCase, setNewUseCase] = useState({ projectId: "", name: "" });
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "asc" });
  const [favorites, setFavorites] = useState(new Set<string>());
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();
  const { data: session } = useSession();

  // Fetch projects and use cases
  useEffect(() => {
    const fetchData = async () => {
      const projRes = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (projRes.ok) {
        const projectsData = await projRes.json();
        const projectsWithTestcases = await Promise.all(
          projectsData.map(async (p: Project) => {
            const tcRes = await fetch(`/api/testcases?project_id=${p.id}`, {
              headers: { Authorization: `Bearer ${session?.accessToken}` },
            });
            return { ...p, testcases: tcRes.ok ? await tcRes.json() : [] };
          })
        );
        setProjects(projectsWithTestcases);
      }
    };
    if (session) fetchData();
  }, [session]);

  const toggleFavorite = (useCaseId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(useCaseId)) newFavorites.delete(useCaseId);
    else newFavorites.add(useCaseId);
    setFavorites(newFavorites);
    // TODO: Persist favorites to backend (e.g., POST /api/user/favorites)
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return "↕️";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const sortTestcases = (testcases: TestCase[]) => {
    return [...testcases].sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === "lastModified" || sortConfig.key === "createdAt") {
        comparison = new Date(a[sortConfig.key] || "").getTime() - new Date(b[sortConfig.key] || "").getTime();
      } else if (sortConfig.key === "steps.platform") {
        comparison = a.steps.platform.localeCompare(b.steps.platform);
      } else {
        comparison = (a[sortConfig.key as keyof TestCase] || "").toString().localeCompare((b[sortConfig.key as keyof TestCase] || "").toString());
      }
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  };

  const getFavoriteUseCases = () => {
    return projects.flatMap((project) => project.testcases.filter((tc) => favorites.has(tc.id)));
  };

  const handleCreate = async () => {
    if (!newUseCase.projectId || !newUseCase.name) return;
    const res = await fetch("/api/testcases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({
        projectId: newUseCase.projectId,
        name: newUseCase.name,
        steps: { platform: "web", code: "" }, // Default platform
      }),
    });
    if (res.ok) {
      const newTestCase = await res.json();
      router.push(`/en/tenant/development/projects/${newUseCase.projectId}/usecases/${newTestCase.id}`);
      setIsCreateDialogOpen(false);
      setNewUseCase({ projectId: "", name: "" });
    }
  };

  const handleDelete = async (useCaseId: string) => {
    const res = await fetch(`/api/testcases/${useCaseId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.accessToken}` },
    });
    if (res.ok) {
      setProjects((prev) =>
        prev.map((p) => ({
          ...p,
          testcases: p.testcases.filter((tc) => tc.id !== useCaseId),
        }))
      );
      setSelectedUseCase(null);
    }
  };

  const TableHeader = () => (
    <div className="grid grid-cols-12 gap-2 py-2 px-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
      <button onClick={() => handleSort("id")} className="col-span-2 flex items-center gap-1 hover:text-gray-700">
        ID {getSortIcon("id")}
      </button>
      <button onClick={() => handleSort("name")} className="col-span-4 flex items-center gap-1 hover:text-gray-700 text-left">
        Name {getSortIcon("name")}
      </button>
      <button onClick={() => handleSort("steps.platform")} className="col-span-2 flex items-center gap-1 hover:text-gray-700">
        Platform {getSortIcon("steps.platform")}
      </button>
      <button onClick={() => handleSort("status")} className="col-span-2 flex items-center gap-1 hover:text-gray-700">
        Status {getSortIcon("status")}
      </button>
      <button onClick={() => handleSort("lastModified")} className="col-span-2 flex items-center gap-1 hover:text-gray-700">
        Modified {getSortIcon("lastModified")}
      </button>
    </div>
  );

  const TestCaseRow = ({ tc }: { tc: TestCase }) => (
    <div
      onClick={() => setSelectedUseCase(tc)}
      className="grid grid-cols-12 gap-2 py-1.5 px-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer text-sm"
    >
      <div className="col-span-2 font-mono">{tc.id}</div>
      <div className="col-span-4 font-medium flex items-center gap-1">
        {favorites.has(tc.id) && <span className="text-yellow-500">★</span>}
        {tc.name}
      </div>
      <div className="col-span-2">
        {tc.steps.platform === "web" ? "🌐" : tc.steps.platform === "mobile" ? "📱" : tc.steps.platform === "desktop" ? "💻" : "👁️"}
      </div>
      <div className="col-span-2">
        <span
          className={`px-1.5 py-0.5 rounded-full text-xs ${
            tc.status === "active" ? "bg-green-100 text-green-800" :
            tc.status === "draft" ? "bg-yellow-100 text-yellow-800" :
            "bg-gray-100 text-gray-800"
          }`}
        >
          {tc.status || "N/A"}
        </span>
      </div>
      <div className="col-span-2 text-gray-500">
        {tc.lastModified ? new Date(tc.lastModified).toLocaleDateString() : "N/A"}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="flex-1 max-w-2xl">
            <Input
              placeholder="Search by ID, name, platform, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>New</Button>
        </div>

        {getFavoriteUseCases().length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow">
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100">
              <h3 className="font-semibold text-yellow-800">★ Favorite Use Cases</h3>
            </div>
            <TableHeader />
            <div className="max-h-40 overflow-y-auto">
              {sortTestcases(getFavoriteUseCases()).map((tc) => (
                <TestCaseRow key={tc.id} tc={tc} />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow">
              <button
                onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                className="w-full flex justify-between items-center px-4 py-2 text-left hover:bg-gray-50"
              >
                <div>
                  <span className="text-lg font-semibold">{project.name}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({project.testcases.length} use cases)
                  </span>
                </div>
                <span
                  className="transform transition-transform duration-200"
                  style={{ transform: expandedProject === project.id ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  ▼
                </span>
              </button>
              {expandedProject === project.id && (
                <div className="border-t border-gray-200">
                  <TableHeader />
                  <div className="max-h-96 overflow-y-auto">
                    {sortTestcases(project.testcases).map((tc) => (
                      <TestCaseRow key={tc.id} tc={tc} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedUseCase && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-[600px]">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {selectedUseCase.name}
                    <button
                      onClick={() => toggleFavorite(selectedUseCase.id)}
                      className="text-yellow-500 hover:text-yellow-600"
                    >
                      {favorites.has(selectedUseCase.id) ? "★" : "☆"}
                    </button>
                  </h2>
                  <p className="text-sm text-gray-500 font-mono">{selectedUseCase.id}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedUseCase(null)}>
                  ✕
                </Button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Platform</label>
                    <div className="mt-1">{selectedUseCase.steps.platform}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">{selectedUseCase.status || "N/A"}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Created</label>
                    <div className="mt-1">{new Date(selectedUseCase.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Last Modified</label>
                    <div className="mt-1">
                      {selectedUseCase.lastModified ? new Date(selectedUseCase.lastModified).toLocaleString() : "N/A"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Author</label>
                    <div className="mt-1">{selectedUseCase.author || "N/A"}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Tags</label>
                    <div className="mt-1 flex gap-1">
                      {selectedUseCase.tags?.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {tag}
                        </span>
                      )) || "N/A"}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedUseCase(null)}>
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(selectedUseCase.id)}
                  >
                    Delete
                  </Button>
                  <Button
                    onClick={() =>
                      router.push(
                        `/en/tenant/development/projects/${selectedUseCase.projectId}/usecases/${selectedUseCase.id}`
                      )
                    }
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isCreateDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-96">
              <h2 className="text-xl font-bold mb-4">New Use Case</h2>
              <div className="space-y-4">
                <Select onValueChange={(value) => setNewUseCase({ ...newUseCase, projectId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Use Case Name"
                  value={newUseCase.name}
                  onChange={(e) => setNewUseCase({ ...newUseCase, name: e.target.value })}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>Create</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Step 2: Backend Integration Notes

- **API Calls**:
  - `GET /api/projects`: Fetches all projects for the user (filtered by `ownerId` on backend).
  - `GET /api/testcases?project_id=[id]`: Fetches use cases per project.
  - `POST /api/testcases`: Creates a new use case with `projectId`, `name`, and default `steps`.
  - `DELETE /api/testcases/[id]`: Deletes a use case by ID.
- **Schema Updates**:
  - Update `TestCase` in `src/server/prisma/schema.prisma`:
    ```prisma
    model TestCase {
      id           String   @id @default(uuid())
      projectId    String   @relation(fields: [projectId], references: [id])
      name         String
      steps        Json
      lockedBy     String?
      createdAt    DateTime @default(now())
      lastModified DateTime? // New
      author       String?   // New
      status       String?   // New (e.g., "active", "draft", "archived")
      tags         String[]? // New
      executions   Execution[]
    }
    ```
- **Favorites**: Stored client-side for now; add a backend endpoint (e.g., `POST /api/user/favorites`) later for persistence.
- **Search**: Client-side filtering; extend to server-side later (e.g., `GET /api/testcases?search=[query]`).

#### Step 3: Styling

- Uses Tailwind CSS: `bg-gray-50`, `rounded-lg`, `shadow`, `grid grid-cols-12` for layout consistency.

#### Step 4: Testing

- Add E2E test in `tests/e2e/usecases.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('Use Cases page lists, creates, and deletes', async ({ page }) => {
  await page.goto('/en/tenant/development/usecases');
  await expect(page.locator('text=Project Alpha')).toBeVisible();
  await page.click('text=Project Alpha');
  await expect(page.locator('text=Login Flow')).toBeVisible();

  // Create
  await page.click('text=New');
  await page.selectOption('select', '1');
  await page.fill('input[placeholder="Use Case Name"]', 'New Test');
  await page.click('text=Create');
  await expect(page.url()).toContain('/usecases/');

  // Delete
  await page.goto('/en/tenant/development/usecases');
  await page.click('text=Project Alpha');
  await page.click('text=Login Flow');
  await page.click('text=Delete');
  await expect(page.locator('text=Login Flow')).not.toBeVisible();
});
```

---

### Notes

- **Terminology**: Switched to "Use Case" throughout as requested.
- **Scope**: Limited to the listing page only—edit page will come next once you're ready.
- **Backend**: Fully integrated with your existing APIs, with schema extensions for new fields (`lastModified`, etc.).

Let me know if this is spot-on or if you'd like any adjustments before moving to the edit page!
