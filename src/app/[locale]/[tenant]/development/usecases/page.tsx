'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useParams } from 'next/navigation';
import { useUser } from '@/lib/contexts/UserContext';

type Project = {
  id: string;
  name: string;
  testcases: TestCase[];
};

type TestCase = {
  id: string;
  shortId: string;
  name: string;
  steps: { platform: string; code: string };
  createdAt: string;
  lastModified?: string;
  author?: string;
  status?: string;
  tags?: string[];
};

export default function UseCasesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<TestCase | null>(null);
  const [newUseCase, setNewUseCase] = useState({ 
    projectId: "", 
    name: "", 
    description: "",
    platform: "web" 
  });
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "asc" });
  const [favorites, setFavorites] = useState(new Set<string>());
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: userLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${params.locale}/login`);
    }
  }, [userLoading, user, router, params.locale]);

  // Fetch projects and use cases
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const projRes = await fetch("http://localhost:5001/api/projects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!projRes.ok) {
          if (projRes.status === 401) {
            router.push(`/${params.locale}/login`);
            return;
          }
          throw new Error('Failed to fetch projects');
        }
        const projectsData = await projRes.json();
        const projectsWithTestcases = await Promise.all(
          projectsData.map(async (p: Project) => {
            try {
              const tcRes = await fetch(`http://localhost:5001/api/testcases?project_id=${p.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              let testcases = [];
              if (tcRes.status === 400 || !tcRes.ok) {
                // If 400 Bad Request or any other error, treat it as no test cases available
                console.log(`No test cases found for project ${p.id} or error occurred`);
                testcases = [];
              } else {
                testcases = await tcRes.json();
              }
              // Always return the project with its test cases array (empty if none)
              return { ...p, testcases };
            } catch (err) {
              console.error(`Failed to fetch test cases for project ${p.id}:`, err);
              // Return project with empty test cases array if fetch fails
              return { ...p, testcases: [] };
            }
          })
        );
        setProjects(projectsWithTestcases);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  const toggleFavorite = async (useCaseId: string) => {
    try {
      const token = localStorage.getItem('token');
      const newFavorites = new Set(favorites);
      if (newFavorites.has(useCaseId)) {
        newFavorites.delete(useCaseId);
        await fetch(`http://localhost:5001/api/testcases/${useCaseId}/favorite`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        newFavorites.add(useCaseId);
        await fetch(`http://localhost:5001/api/testcases/${useCaseId}/favorite`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setFavorites(newFavorites);
    } catch (err) {
      console.error('Failed to update favorite:', err);
    }
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
    try {
      if (!newUseCase.projectId || !newUseCase.name) return;
      const token = localStorage.getItem('token');
      const res = await fetch("http://localhost:5001/api/testcases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: newUseCase.projectId,
          name: newUseCase.name,
          description: newUseCase.description,
          steps: { platform: newUseCase.platform, code: "" },
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to create use case');
      }
      const newTestCase = await res.json();
      router.push(`/${params.locale}/${params.tenant}/development/usecases/edit/${newTestCase.shortId}`);
      setIsCreateDialogOpen(false);
      setNewUseCase({ projectId: "", name: "", description: "", platform: "web" });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create use case');
    }
  };

  const handleDelete = async (useCaseId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5001/api/testcases/${useCaseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to delete use case');
      }
      setProjects((prev) =>
        prev.map((p) => ({
          ...p,
          testcases: p.testcases.filter((tc) => tc.id !== useCaseId),
        }))
      );
      setSelectedUseCase(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete use case');
    }
  };

  const TableHeader = () => (
    <div className="grid grid-cols-12 gap-2 py-2 px-3 bg-muted/50 dark:bg-muted/20 border-b border-border text-xs font-medium text-muted-foreground">
      <button onClick={() => handleSort("id")} className="col-span-2 flex items-center gap-1 hover:text-foreground">
        ID {getSortIcon("id")}
      </button>
      <button onClick={() => handleSort("name")} className="col-span-4 flex items-center gap-1 hover:text-foreground text-left">
        Name {getSortIcon("name")}
      </button>
      <button onClick={() => handleSort("steps.platform")} className="col-span-2 flex items-center gap-1 hover:text-foreground">
        Platform {getSortIcon("steps.platform")}
      </button>
      <button onClick={() => handleSort("status")} className="col-span-2 flex items-center gap-1 hover:text-foreground">
        Status {getSortIcon("status")}
      </button>
      <button onClick={() => handleSort("lastModified")} className="col-span-2 flex items-center gap-1 hover:text-foreground">
        Modified {getSortIcon("lastModified")}
      </button>
    </div>
  );

  const TestCaseRow = ({ tc }: { tc: TestCase }) => (
    <div
      onClick={() => setSelectedUseCase(tc)}
      className="grid grid-cols-12 gap-2 py-1.5 px-3 hover:bg-muted/50 dark:hover:bg-muted/20 border-b border-border cursor-pointer text-sm text-foreground"
    >
      <div className="col-span-2 font-mono">{tc.shortId}</div>
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
            tc.status === "active" ? "bg-success/20 text-success" :
            tc.status === "draft" ? "bg-warning/20 text-warning" :
            "bg-muted text-muted-foreground"
          }`}
        >
          {tc.status || "N/A"}
        </span>
      </div>
      <div className="col-span-2 text-muted-foreground">
        {tc.lastModified ? new Date(tc.lastModified).toLocaleDateString() : "N/A"}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 p-6 overflow-hidden">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}
        
        {userLoading || isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          </div>
        ) : (
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
        )}

        {!isLoading && !error && (
          <>
            {getFavoriteUseCases().length > 0 && (
              <div className="mb-6 bg-background rounded-lg shadow border border-border">
                <div className="px-4 py-2 bg-muted border-b border-border">
                  <h3 className="font-semibold text-foreground">★ Favorite Use Cases</h3>
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
                <div key={project.id} className="bg-background rounded-lg shadow border border-border">
                  <button
                    onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                    className="w-full flex justify-between items-center px-4 py-2 text-left hover:bg-muted/50 dark:hover:bg-muted/20"
                  >
                    <div>
                      <span className="text-lg font-semibold text-foreground">{project.name}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {project.testcases.length === 0 ? (
                          "No test cases yet"
                        ) : (
                          `${project.testcases.length} test case${project.testcases.length === 1 ? '' : 's'}`
                        )}
                      </span>
                    </div>
                    <span
                      className="transform transition-transform duration-200 text-muted-foreground"
                      style={{ transform: expandedProject === project.id ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      ▼
                    </span>
                  </button>
                  {expandedProject === project.id && (
                    <div className="border-t border-border">
                      <TableHeader />
                      <div className="max-h-96 overflow-y-auto">
                        {project.testcases.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <p className="mb-2">No test cases found in this project</p>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setNewUseCase({ projectId: project.id, name: "", description: "", platform: "web" });
                                setIsCreateDialogOpen(true);
                              }}
                            >
                              Create your first test case
                            </Button>
                          </div>
                        ) : (
                          sortTestcases(project.testcases).map((tc) => (
                            <TestCaseRow key={tc.id} tc={tc} />
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isCreateDialogOpen && (
              <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[49]">
                <div className="bg-background border border-border w-[500px] rounded-lg shadow-lg relative z-[50] select-none">
                  <div className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-foreground">New Test Case</h2>
                    <div className="space-y-4">
                      <Select 
                        onValueChange={(value) => setNewUseCase({ ...newUseCase, projectId: value })}
                        value={newUseCase.projectId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[51]">
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Input
                        placeholder="Test Case Name"
                        value={newUseCase.name}
                        onChange={(e) => setNewUseCase({ ...newUseCase, name: e.target.value })}
                        className="bg-background"
                      />

                      <Select 
                        onValueChange={(value) => setNewUseCase({ ...newUseCase, platform: value })}
                        value={newUseCase.platform}
                        defaultOpen={false}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="web">Web 🌐</SelectItem>
                          <SelectItem value="android">Android 📱</SelectItem>
                          <SelectItem value="ios">iOS 📱</SelectItem>
                          <SelectItem value="desktop">Desktop 💻</SelectItem>
                          <SelectItem value="api">API 🔌</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Description (Optional)</label>
                        <textarea 
                          className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Enter test case description..."
                          value={newUseCase.description}
                          onChange={(e) => setNewUseCase({ ...newUseCase, description: e.target.value })}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t border-border">
                        <Button variant="outline" onClick={() => {
                          setIsCreateDialogOpen(false);
                          setNewUseCase({ projectId: "", name: "", description: "", platform: "web" });
                        }}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreate}
                          disabled={!newUseCase.projectId || !newUseCase.name}
                        >
                          Create
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedUseCase && (
              <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100]">
                <div className="bg-background border border-border w-[600px] rounded-lg shadow-lg relative z-[101]">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                          {selectedUseCase.name}
                          <button
                            onClick={() => toggleFavorite(selectedUseCase.id)}
                            className="text-yellow-500 hover:text-yellow-600"
                          >
                            {favorites.has(selectedUseCase.id) ? "★" : "☆"}
                          </button>
                        </h2>
                        <p className="text-sm text-muted-foreground font-mono">{selectedUseCase.shortId}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedUseCase(null)}>
                        ✕
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">Platform</label>
                          <div className="mt-1 text-foreground">{selectedUseCase.steps.platform}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">Status</label>
                          <div className="mt-1 text-foreground">{selectedUseCase.status || "N/A"}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">Created</label>
                          <div className="mt-1 text-foreground">{new Date(selectedUseCase.createdAt).toLocaleString()}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">Last Modified</label>
                          <div className="mt-1 text-foreground">
                            {selectedUseCase.lastModified ? new Date(selectedUseCase.lastModified).toLocaleString() : "N/A"}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">Author</label>
                          <div className="mt-1 text-foreground">{selectedUseCase.author || "N/A"}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground">Tags</label>
                          <div className="mt-1 text-foreground flex gap-1">
                            {selectedUseCase.tags?.map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-muted rounded-full text-xs">
                                {tag}
                              </span>
                            )) || "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                        <Button variant="outline" onClick={() => setSelectedUseCase(null)}>
                          Close
                        </Button>
                        <Button
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(selectedUseCase.id)}
                        >
                          Delete
                        </Button>
                        <Button
                          onClick={() =>
                            router.push(`/${params.locale}/${params.tenant}/development/usecases/edit/${selectedUseCase.shortId}`)
                          }
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 