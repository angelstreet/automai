Let’s enhance the **Projects Page** implementation by integrating it with your backend architecture as outlined in the "Backend Architecture & API Updates" document. I’ll ensure the table (using `shadcn-ui` + `@tanstack/react-table`) interacts with your existing APIs (`/api/projects`) and respects your tech stack (Next.js, Prisma, Supabase, etc.). I’ll also refine the AI agent instructions to include these backend integrations.

---

### Updated Design Document: Projects Page with Backend Integration

#### Layout
| **Section**         | **Description**                                                                 | **Components**                     |
|---------------------|--------------------------------------------------------------------------------|------------------------------------|
| **Header**          | Title: "Projects", button to "Create New Project"                              | `<Button>` (shadcn-ui)            |
| **Sidebar**         | Navigation to Dashboard, Development, Execution, Reports, Settings             | `<Sidebar>` (layout component)    |
| **Main Content**    | Elegant table listing all projects fetched from `/api/projects`                | `<Table>` (shadcn-ui), `@tanstack/react-table` |
| **Modal (Create/Edit)** | Form to input project name and description, syncs with `POST /api/projects` | `<Dialog>` (shadcn-ui)            |

#### Table Columns
| **Column**       | **Description**                   | **Interactivity**                  | **Backend Mapping**          |
|------------------|-----------------------------------|-------------------------------------|-----------------------------|
| **Name**         | Project name                     | Sortable, clickable to view use cases | `name` from `Project` model |
| **Description**  | Brief project description        | -                                   | `description` (optional)    |
| **Created At**   | Date of creation                 | Sortable                            | `createdAt` from `Project`  |
| **Actions**      | Edit, Delete buttons             | `<Button>` (Edit/Delete triggers)   | Triggers API calls          |

#### Workflow with Backend Integration
1. **User Lands on Page**:
   - Fetches projects from `GET /api/projects` (returns `Project[]` from Prisma).
   - Table renders data with `@tanstack/react-table`.
2. **Create Project**:
   - "Create New Project" → `<Dialog>` → Submits to `POST /api/projects` with `{ name, description, ownerId }`.
   - Backend assigns `id` (UUID) and `createdAt`, returns new project → Table updates.
3. **Edit Project**:
   - "Edit" → `<Dialog>` pre-filled with project data → `PATCH /api/projects/[id]` (not explicitly in doc, but implied).
   - Table reflects updated data.
4. **Delete Project**:
   - "Delete" → `<Dialog>` confirmation → `DELETE /api/projects/[id]` → Table updates.
5. **View Project**:
   - Click Name → Navigates to `/[locale]/[tenant]/development/projects/[projectId]/usecases`.

#### Backend Assumptions
- **API**: `/api/projects` endpoints are implemented in `src/server/api/routes.ts` using Node.js/Express or FastAPI.
- **Prisma**: Uses the `Project` model from `schema.prisma`.
- **Auth**: `ownerId` is derived from the authenticated user (NextAuth.js session).
- **Response Format**:
  - `GET /api/projects`: Returns `{ id: string, name: string, description?: string, createdAt: string, ownerId: string }[]`.
  - `POST /api/projects`: Expects `{ name: string, description?: string, ownerId: string }`, returns created project.
  - `DELETE /api/projects/:id`: Returns success status.

---

### Updated Instructions for AI Agent: Projects Page with Backend Integration

#### Prerequisites
- **Dependencies**:
  ```bash
  npm install @tanstack/react-table @supabase/supabase-js
  npx shadcn-ui@latest add table button dialog input
  ```
- **Backend**: Ensure `/api/projects` endpoints are functional per the backend doc.
- **Auth**: Use NextAuth.js session to get `ownerId` (assumed available via `useSession`).
- **Supabase**: Configure `SUPABASE_URL` and `SUPABASE_KEY` in `.env` (not directly used here but part of your stack).

#### Step 1: File Setup
- Create `src/app/[locale]/[tenant]/development/projects/page.tsx`.

#### Step 2: Implement Page with Backend Integration
```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Sidebar from "@/components/layout/Sidebar";

// Type matching Prisma Project model
type Project = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  ownerId: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      const res = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    };
    if (session) fetchProjects();
  }, [session]);

  // Define table columns
  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span
          className="cursor-pointer text-blue-600 hover:underline"
          onClick={() =>
            router.push(
              `/[locale]/[tenant]/development/projects/${row.original.id}/usecases`
            )
          }
        >
          {row.getValue("name")}
        </span>
      ),
      enableSorting: true,
    },
    { accessorKey: "description", header: "Description" },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => new Date(row.getValue("createdAt")).toLocaleDateString(),
      enableSorting: true,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingProject(row.original)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // Enable sorting
  });

  // CRUD handlers
  const handleCreate = async () => {
    if (!session?.user?.id) return;
    const payload = {
      name: newProject.name,
      description: newProject.description,
      ownerId: session.user.id,
    };
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const createdProject = await res.json();
      setProjects([...projects, createdProject]);
      setIsDialogOpen(false);
      setNewProject({ name: "", description: "" });
    }
  };

  const handleEdit = async () => {
    if (!editingProject || !session) return;
    const res = await fetch(`/api/projects/${editingProject.id}`, {
      method: "PATCH", // Assuming PATCH is supported; adjust if backend uses PUT
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        name: editingProject.name,
        description: editingProject.description,
      }),
    });
    if (res.ok) {
      const updatedProject = await res.json();
      setProjects(
        projects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      );
      setEditingProject(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!session) return;
    const res = await fetch(`/api/projects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (res.ok) {
      setProjects(projects.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Projects</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Name"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Description"
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({ ...newProject, description: e.target.value })
                  }
                />
                <Button onClick={handleCreate}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        {editingProject && (
          <Dialog
            open={!!editingProject}
            onOpenChange={() => setEditingProject(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Name"
                  value={editingProject.name}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Description"
                  value={editingProject.description || ""}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      description: e.target.value,
                    })
                  }
                />
                <Button onClick={handleEdit}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: " ↑",
                      desc: " ↓",
                    }[header.column.getIsSorted() as string] ?? null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-gray-100">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

#### Step 3: Backend Integration Notes
- **API Calls**:
  - `GET /api/projects`: Fetches all projects for the authenticated user (filtered by `ownerId` on backend).
  - `POST /api/projects`: Creates a new project with `name`, `description`, and `ownerId` from session.
  - `PATCH /api/projects/[id]`: Updates project (assumed; not explicitly in doc—adjust to `PUT` if needed).
  - `DELETE /api/projects/[id]`: Deletes project by ID.
- **Auth**:
  - Use `useSession` from `next-auth/react` to get `accessToken` and `user.id`.
  - Include `Authorization` header with `Bearer ${session.accessToken}` in all API requests.
- **Error Handling**:
  - Add basic error checking (e.g., `if (!res.ok) throw new Error("API Error")`)—expand as needed.
- **Prisma Schema**:
  - Matches `Project` model: `{ id, name, ownerId, createdAt, description? }`.

#### Step 4: Styling
- Tailwind CSS in `tailwind.config.js`:
  - Table: `hover:bg-gray-100` on `<TableRow>`.
  - Headers: `font-semibold text-gray-700` on `<TableHead>`.

#### Step 5: Testing
- Update `tests/e2e/projects.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("Projects page loads and integrates with backend", async ({ page }) => {
  await page.goto("/en/tenant/development/projects");
  await expect(page.locator("h1")).toHaveText("Projects");

  // Create project
  await page.click("text=Create New Project");
  await page.fill('input[placeholder="Name"]', "Test Project");
  await page.fill('input[placeholder="Description"]', "Test Desc");
  await page.click("text=Save");
  await expect(page.locator("text=Test Project")).toBeVisible();

  // Edit project
  await page.click("text=Edit");
  await page.fill('input[placeholder="Name"]', "Updated Project");
  await page.click("text=Save");
  await expect(page.locator("text=Updated Project")).toBeVisible();

  // Delete project
  await page.click("text=Delete");
  await expect(page.locator("text=Updated Project")).not.toBeVisible();
});
```

---

### Key Backend Integration Points
1. **Authentication**: Leverages NextAuth.js for session management, ensuring `ownerId` links projects to users.
2. **API Endpoints**: Uses `/api/projects` endpoints as defined, with PATCH assumed for edits (confirm with backend implementation).
3. **Data Model**: Aligns with Prisma `Project` schema, ensuring frontend and backend sync perfectly.
4. **Sorting**: Added `@tanstack/react-table` sorting on `name` and `createdAt`, handled client-side (backend sorting could be added later via query params).

---

### Next Steps
- **Confirmation**: Does this integration match your backend setup? Any adjustments (e.g., `PATCH` vs `PUT`, error handling)?
- **Use Case Page**: Ready to move to that next, or refine this further?
- **Agent Deployment**: Instructions are detailed—ready to hand off, or need a specific format?

This now ties your frontend table to your backend architecture seamlessly. Let me know what you think!