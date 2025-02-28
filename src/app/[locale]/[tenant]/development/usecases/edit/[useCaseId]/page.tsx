'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/Shadcn/button';
import { Card } from '@/components/Shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/Shadcn/tabs';
import Editor from '@monaco-editor/react';
import { useUser } from '@/context/UserContext';
import { useSession } from 'next-auth/react';

type TestCase = {
  id: string;
  projectId: string;
  project_id?: string;
  name: string;
  steps: { platform: string; code: string };
  createdAt: string;
};

export default function UseCaseEditPage() {
  const [activeTab, setActiveTab] = useState('editor');
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [script, setScript] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [useCase, setUseCase] = useState<TestCase | null>(null);
  const [projectName, setProjectName] = useState('');
  const [versions, setVersions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const { useCaseId } = params;
  const { user } = useUser();
  const { data: session } = useSession();

  // Fetch use case and project data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!session?.accessToken) {
          router.push(`/${params.locale}/login`);
          return;
        }

        const tcRes = await fetch(`http://localhost:5001/api/usecases/${useCaseId}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        if (!tcRes.ok) {
          throw new Error('Failed to fetch use case');
        }
        const data = await tcRes.json();
        console.log('Use case data:', data);
        setUseCase(data);
        setScript(data.steps.code || getDefaultScript(data.steps.platform));

        // Get project name from URL search params
        const searchParams = new URLSearchParams(window.location.search);
        const projectNameFromUrl = searchParams.get('projectName');
        if (projectNameFromUrl) {
          setProjectName(decodeURIComponent(projectNameFromUrl));
        } else {
          setError('Project name not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    if (user && session) fetchData();
  }, [user, session, useCaseId, router, params.locale]);

  const getDefaultScript = (platform: string) => {
    switch (platform) {
      case 'web':
        return `const { chromium } = require('playwright');\n(async () => {\n  const browser = await chromium.launch();\n  const page = await browser.newPage();\n  await page.goto('https://example.com');\n  await browser.close();\n})();`;
      case 'mobile':
        return `from appium import webdriver\ndriver = webdriver.Remote('http://localhost:4723/wd/hub', {'platformName': 'Android'})\ndriver.quit()`;
      case 'desktop':
        return `from pywinauto import Application\napp = Application().start('notepad.exe')\napp.kill()`;
      case 'vision':
        return `# Vision AI placeholder\nprint("Omniparser integration TBD")`;
      default:
        return '';
    }
  };

  const handleSave = async () => {
    try {
      if (!useCase || !session?.accessToken) return;

      const payload = {
        name: useCase.name,
        projectId: useCase.projectId || useCase.project_id,
        steps: { platform: useCase.steps.platform, code: script },
      };
      const res = await fetch(`http://localhost:5001/api/usecases/${useCaseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error('Failed to save use case');
      }

      // Sync with Git
      const syncRes = await fetch(`http://localhost:5001/api/usecases/${useCaseId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
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
      if (!useCase || !session?.accessToken) return;

      const res = await fetch('http://localhost:5001/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ useCaseId, script }),
      });
      if (!res.ok) {
        throw new Error('Failed to execute use case');
      }
      if (useCase.steps.platform === 'web') {
        const data = await res.json();
        setPreviewUrl(data.previewUrl);
        setActiveTab('preview');
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
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="hover:bg-muted/50 dark:hover:bg-muted/20"
                  >
                    ←
                  </Button>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-foreground dark:text-foreground">
                      {projectName} / {useCase?.name || 'New Use Case'}
                    </h1>
                    <span className="text-sm px-2 py-1 bg-muted dark:bg-muted/80 rounded text-muted-foreground dark:text-muted-foreground">
                      {useCase?.steps.platform === 'web'
                        ? 'Web 🌐'
                        : useCase?.steps.platform === 'android'
                          ? 'Android 📱'
                          : useCase?.steps.platform === 'ios'
                            ? 'iOS 📱'
                            : useCase?.steps.platform === 'desktop'
                              ? 'Desktop 💻'
                              : useCase?.steps.platform === 'python'
                                ? 'Python 🐍'
                                : useCase?.steps.platform === 'api'
                                  ? 'API 🔌'
                                  : 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (script !== useCase?.steps.code) {
                        setIsCancelModalOpen(true);
                      } else {
                        router.back();
                      }
                    }}
                  >
                    Cancel
                  </Button>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-sm text-muted-foreground dark:text-muted-foreground flex items-center gap-1 hover:text-foreground dark:hover:text-foreground/90"
                      onClick={() => setIsVersionsOpen(!isVersionsOpen)}
                    >
                      Version History
                    </Button>
                  </div>

                  <div className="flex h-full">
                    <TabsContent value="editor" className="h-full m-0 w-full">
                      <Card className="h-full border-border dark:border-border/80 bg-background dark:bg-[#1E1E1E]">
                        <Editor
                          height="70vh"
                          language={useCase?.steps.platform === 'web' ? 'javascript' : 'python'}
                          value={script}
                          onChange={(value) => setScript(value || '')}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineHeight: 21,
                            padding: { top: 16, bottom: 16 },
                            scrollBeyondLastLine: false,
                            renderLineHighlight: 'all',
                            contextmenu: true,
                            scrollbar: {
                              verticalScrollbarSize: 8,
                              horizontalScrollbarSize: 8,
                            },
                          }}
                        />
                      </Card>
                    </TabsContent>
                    <TabsContent value="preview" className="h-full m-0 w-full">
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
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100]">
                      <div className="bg-background dark:bg-background border border-border w-[500px] max-h-[80vh] rounded-lg shadow-lg relative z-[101] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-border">
                          <h3 className="text-xl font-bold text-foreground dark:text-foreground">
                            Version History
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsVersionsOpen(false)}
                          >
                            ✕
                          </Button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                          {versions.length ? (
                            <div className="space-y-4">
                              {versions.map((version, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/10 dark:bg-muted/5"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm text-foreground dark:text-foreground/90">
                                      {version}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2"
                                    onClick={() => {
                                      // TODO: Implement version restore functionality
                                      console.log('Restore version:', version);
                                    }}
                                  >
                                    Restore
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                              <p className="text-muted-foreground dark:text-muted-foreground">
                                No versions available
                              </p>
                              <p className="text-sm mt-1 text-muted-foreground dark:text-muted-foreground">
                                Save changes to create a new version
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Tabs>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100]">
          <div className="bg-background dark:bg-background border border-border w-[400px] rounded-lg shadow-lg relative z-[101]">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                Unsaved Changes
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-6">
                You have unsaved changes. Are you sure you want to leave?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsCancelModalOpen(false)}>
                  Stay
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setIsCancelModalOpen(false);
                    router.back();
                  }}
                >
                  Leave
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
