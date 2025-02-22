'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Editor from '@monaco-editor/react';
import { useUser } from '@/lib/contexts/UserContext';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { useCaseId } = useParams();
  const { user } = useUser();

  // Fetch use case and project data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const tcRes = await fetch(`http://localhost:5001/api/usecases/${useCaseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!tcRes.ok) {
          throw new Error('Failed to fetch use case');
        }
        const data = await tcRes.json();
        setUseCase(data);
        setScript(data.steps.code || getDefaultScript(data.steps.platform));
        
        // Fetch project name
        const projRes = await fetch(`http://localhost:5001/api/projects/${data.projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!projRes.ok) {
          throw new Error('Failed to fetch project details');
        }
        setProjectName((await projRes.json()).name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    if (user) fetchData();
  }, [user, useCaseId]);

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
    try {
      if (!useCase) return;
      const token = localStorage.getItem('token');
      const payload = {
        name: useCase.name,
        projectId: useCase.projectId,
        steps: { platform: useCase.steps.platform, code: script },
      };
      const res = await fetch(`http://localhost:5001/api/usecases/${useCaseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error('Failed to save use case');
      }
      
      // Sync with Git
      const syncRes = await fetch(`http://localhost:5001/api/usecases/${useCaseId}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!syncRes.ok) {
        throw new Error('Failed to sync with Git');
      }
      
      setVersions([...versions, `Commit at ${new Date().toISOString()}`]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save use case');
    }
  };

  const handleRun = async () => {
    try {
      if (!useCase) return;
      const token = localStorage.getItem('token');
      const res = await fetch("http://localhost:5001/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ useCaseId, script }),
      });
      if (!res.ok) {
        throw new Error('Failed to execute use case');
      }
      if (useCase.steps.platform === "web") {
        const data = await res.json();
        setPreviewUrl(data.previewUrl);
        setActiveTab("preview");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute use case');
    }
  };

  return (
    <div className="flex min-h-screen bg-background dark:bg-background">
      <div className="flex-1 p-4">
        <div className="max-w-full mx-auto">
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground dark:text-foreground">{projectName} / {useCase?.name || "New Use Case"}</h1>
                  <span className="text-sm px-2 py-1 bg-muted dark:bg-muted/80 rounded text-muted-foreground dark:text-muted-foreground">
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
                      className="text-sm text-muted-foreground dark:text-muted-foreground flex items-center gap-1 hover:text-foreground dark:hover:text-foreground/90"
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
                        <Card className="h-full border-border dark:border-border/80 bg-background dark:bg-[#1E1E1E]">
                          <Editor
                            height="100%"
                            language={useCase?.steps.platform === "web" ? "javascript" : "python"}
                            value={script}
                            onChange={(value) => setScript(value || "")}
                            theme="vs-dark"
                            options={{ 
                              minimap: { enabled: false },
                              fontSize: 14,
                              lineHeight: 21,
                              padding: { top: 16, bottom: 16 },
                              scrollBeyondLastLine: false,
                              renderLineHighlight: "all",
                              contextmenu: true,
                              scrollbar: {
                                verticalScrollbarSize: 8,
                                horizontalScrollbarSize: 8
                              }
                            }}
                            className="min-h-[300px]"
                          />
                        </Card>
                      </TabsContent>
                      <TabsContent value="preview" className="h-full m-0">
                        <Card className="h-full border-border dark:border-border/80">
                          {previewUrl ? (
                            <iframe src={previewUrl} className="w-full h-full" title="Preview" />
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground dark:text-muted-foreground">
                              Run the script to see a preview (Web only).
                            </div>
                          )}
                        </Card>
                      </TabsContent>
                    </div>

                    {isVersionsOpen && (
                      <Card className="w-64 p-4 overflow-auto border-border dark:border-border/80 bg-background dark:bg-background">
                        <h3 className="font-medium mb-2 text-foreground dark:text-foreground">Version History</h3>
                        <div className="space-y-2 text-sm text-muted-foreground dark:text-muted-foreground">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
} 