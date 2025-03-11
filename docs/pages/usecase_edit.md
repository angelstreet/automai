### Design Document: Use Case Edit Page

#### Page Location

- `/[locale]/[tenant]/development/projects/[projectId]/usecases/[useCaseId]`

#### Purpose

- Allow users to edit an existing use case or create a new one.
- Provide an IDE-like script editing experience with a preview option and version history.
- Save changes to the backend and sync with Git.

#### Layout

| **Section**         | **Description**                                                    | **Components**                      |
| ------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| **Header**          | Use case name, platform badge, "Save" and "Run" buttons            | `<Button>` (shadcn-ui)              |
| **Sidebar**         | Navigation to Dashboard, Development, Execution, Reports, Settings | `<Sidebar>` (layout component)      |
| **Main Content**    | Tabs for Editor and Preview, collapsible Version History           | `<Tabs>`, `<Card>` (shadcn-ui)      |
| **Editor Tab**      | Script editor with sample code                                     | `<Card>` with `<pre>` (placeholder) |
| **Preview Tab**     | Displays execution preview (Web only for now)                      | `<Card>`                            |
| **Version History** | Collapsible list of Git commits                                    | Custom toggle with `<Card>`         |

#### Workflow

1. **User Lands on Page**:
   - Fetches use case data from `/api/testcases/[useCaseId]` and project name from `/api/projects/[projectId]`.
   - Loads script from `steps.code` into the editor.
2. **Edit Script**:
   - User modifies the script in the editor (currently a `<pre>` placeholder; will use Monaco Editor).
3. **Run Script**:
   - "Run" → `POST /api/execute` → Shows preview in iframe (Web only for now).
4. **Save Script**:
   - "Save" → `PATCH /api/testcases/[useCaseId]` → Syncs to Git via `/api/testcases/[useCaseId]/sync`.
5. **Toggle Version History**:
   - Shows Git commit history (mocked for now; fetch from backend later).

#### Notes

- Your artifact uses a `<pre>` tag for the editor—I'll assume you want to replace this with Monaco Editor for a true IDE experience, as discussed earlier.
- No metadata section (e.g., platform selection) is present in your artifact; I'll keep it minimal as per your design, but we can add it back if needed.

---

### Instructions for AI Agent: Use Case Edit Page with Backend Integration

#### Prerequisites

- **Dependencies**:
  ```bash
  npm install @monaco-editor/react @supabase/supabase-js next-auth
  npx shadcn-ui@latest add tabs card button
  ```
- **Backend**: Ensure `/api/testcases/[id]`, `/api/execute`, and `/api/testcases/[id]/sync` endpoints are functional.
- **File Location**: `src/app/[locale]/[tenant]/development/projects/[projectId]/usecases/[useCaseId]/page.tsx`.

#### Step 1: Implement Component

```jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import Editor from "@monaco-editor/react";
import Sidebar from "@/components/Layout/Sidebar";

type TestCase = {
  id: string;
  projectId: string;
  name: string;
  steps: { platform: string; code: string };
  createdAt: string;
};

export default function UseCaseEditPage() {
  const [activeTab, setActiveTab] = useState("editor");
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [script, setScript] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [useCase, setUseCase] = useState<TestCase | null>(null);
  const [projectName, setProjectName] = useState("");
  const [versions, setVersions] = useState<string[]>([]);
  const router = useRouter();
  const { projectId, useCaseId } = useParams();
  const { data: session } = useSession();

  // Fetch use case and project data
  useEffect(() => {
    const fetchData = async () => {
      const [tcRes, projRes] = await Promise.all([
        fetch(`/api/testcases/${useCaseId}`, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }),
        fetch(`/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }),
      ]);
      if (tcRes.ok) {
        const data = await tcRes.json();
        setUseCase(data);
        setScript(data.steps.code || getDefaultScript(data.steps.platform));
      }
      if (projRes.ok) setProjectName((await projRes.json()).name);
    };
    if (session) fetchData();
  }, [session, useCaseId, projectId]);

  const getDefaultScript = (platform: string) => {
    switch (platform) {
      case "web":
        return `const { chromium } = require('playwright');\n(async () => {\n  const browser = await chromium.launch();\n  const page = await browser.newPage();\n  await page.goto('https://example.com');\n  await browser.close();\n})();`;
      case "mobile":
        return `from appium import webdriver\ndriver = webdriver.Remote('http://localhost:4723/wd/hub', {'platformName': 'Android'})\ndriver.quit()`;
      case "desktop":
        return `from pywinauto import Application\napp = Application().start('notepad.exe')\napp.kill()`;
      case "vision":
        return `# Vision AI placeholder\nprint("Omniparser integration TBD")`;
      default:
        return "";
    }
  };

  const handleSave = async () => {
    if (!useCase) return;
    const payload = {
      name: useCase.name,
      projectId,
      steps: { platform: useCase.steps.platform, code: script },
    };
    const res = await fetch(`/api/testcases/${useCaseId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await fetch(`/api/testcases/${useCaseId}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setVersions([...versions, `Commit at ${new Date().toISOString()}`]);
    }
  };

  const handleRun = async () => {
    if (!useCase) return;
    const res = await fetch("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({ testcaseId: useCaseId, script }),
    });
    if (res.ok && useCase.steps.platform === "web") {
      setPreviewUrl("/test-results/preview.html"); // Placeholder URL from backend
      setActiveTab("preview");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-4">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{projectName} / {useCase?.name || "New Use Case"}</h1>
              <span className="text-sm px-2 py-1 bg-gray-100 rounded text-gray-600">
                {useCase?.steps.platform === "web" ? "Web 🌐" :
                 useCase?.steps.platform === "mobile" ? "Mobile 📱" :
                 useCase?.steps.platform === "desktop" ? "Desktop 💻" : "Vision 👁️"}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" onClick={handleRun}>
                Run
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col h-[calc(100vh-8rem)]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <TabsList>
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <button
                  className="text-sm text-gray-600 flex items-center gap-1"
                  onClick={() => setIsVersionsOpen(!isVersionsOpen)}
                >
                  <span>Version History</span>
                  <span className="transform transition-transform">
                    {isVersionsOpen ? "▼" : "▶"}
                  </span>
                </button>
              </div>

              <div className="flex gap-4 h-full">
                <div className="flex-1">
                  <TabsContent value="editor" className="h-full m-0">
                    <Card className="h-full">
                      <Editor
                        height="100%"
                        language={useCase?.steps.platform === "web" ? "javascript" : "python"}
                        value={script}
                        onChange={(value) => setScript(value || "")}
                        options={{ minimap: { enabled: false } }}
                      />
                    </Card>
                  </TabsContent>
                  <TabsContent value="preview" className="h-full m-0">
                    <Card className="h-full">
                      {previewUrl ? (
                        <iframe src={previewUrl} className="w-full h-full" title="Preview" />
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          Run the script to see a preview (Web only).
                        </div>
                      )}
                    </Card>
                  </TabsContent>
                </div>

                {isVersionsOpen && (
                  <Card className="w-64 p-4 overflow-auto">
                    <h3 className="font-medium mb-2">Version History</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      {versions.length ? (
                        versions.map((v, i) => <p key={i}>{v}</p>)
                      ) : (
                        <p>No versions yet.</p>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Step 2: Backend Integration Notes

- **API Calls**:
  - `GET /api/testcases/[useCaseId]`: Fetches use case details (`id`, `name`, `steps`, etc.).
  - `GET /api/projects/[projectId]`: Fetches project name.
  - `PATCH /api/testcases/[useCaseId]`: Updates use case with new `steps.code`.
  - `POST /api/testcases/[useCaseId]/sync`: Commits changes to Git.
  - `POST /api/execute`: Runs the script locally, returns preview data (e.g., HTML file path for Web).
- **Schema**: Matches `TestCase` model:
  ```prisma
  model TestCase {
    id        String  @id @default(uuid())
    projectId String  @relation(fields: [projectId], references: [id])
    name      String
    steps     Json    // { platform: string, code: string }
    lockedBy  String?
    createdAt DateTime @default(now())
    executions Execution[]
  }
  ```
- **Preview**: Assumes `/api/execute` returns a URL (e.g., `/test-results/preview.html`) for Web scripts.

#### Step 3: Styling

- Uses Tailwind CSS: `bg-gray-50`, `p-4`, `h-[calc(100vh-8rem)]` for full height, `bg-gray-100` for badge.

#### Step 4: Testing

- E2E test in `tests/e2e/usecase-edit.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('Use Case Edit page edits and runs script', async ({ page }) => {
  await page.goto('/en/tenant/development/projects/1/usecases/1');
  await expect(page.locator('h1')).toContainText('Login Flow');
  await page.locator('.monaco-editor').fill("await page.goto('https://test.com');");
  await page.click('text=Save');
  await page.click('text=Run');
  await expect(page.locator('iframe')).toBeVisible();
});
```

---

### Notes

- **Editor Upgrade**: Replaced `<pre>` with `monaco-editor/react` for a real IDE experience, as your artifact implied a code editor.
- **Platform**: Hardcoded in the badge based on `steps.platform`; could add a dropdown if metadata editing is desired.
- **Version History**: Mocked commits for now—extend with Git API data later (e.g., fetch from backend).
- **Alignment**: Matches your artifact's layout (header, tabs, version toggle) with backend hooks.

Let me know if this fits your vision or if you'd like adjustments (e.g., add metadata editing, tweak styling) before proceeding further! Next, we can refine or test these pages as needed.
