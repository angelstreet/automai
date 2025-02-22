'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useParams } from 'next/navigation';

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
  lastModified?: string;
  author?: string;
  status?: string;
  tags?: string[];
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
  const params = useParams();

  // Add loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects and use cases
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const projRes = await fetch("/api/projects", {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (!projRes.ok) {
          throw new Error('Failed to fetch projects');
        }
        const projectsData = await projRes.json();
        const projectsWithTestcases = await Promise.all(
          projectsData.map(async (p: Project) => {
            const tcRes = await fetch(`/api/usecases?project_id=${p.id}`, {
              headers: { Authorization: `Bearer ${session?.accessToken}` },
            });
            if (!tcRes.ok) {
              throw new Error(`Failed to fetch use cases for project ${p.id}`);
            }
            return { ...p, testcases: await tcRes.json() };
          })
        );
        setProjects(projectsWithTestcases);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    if (session) fetchData();
  }, [session]);

  const toggleFavorite = async (useCaseId: string) => {
    try {
      const newFavorites = new Set(favorites);
      if (newFavorites.has(useCaseId)) {
        newFavorites.delete(useCaseId);
        await fetch(`/api/usecases/${useCaseId}/favorite`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
      } else {
        newFavorites.add(useCaseId);
        await fetch(`/api/usecases/${useCaseId}/favorite`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
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
      const res = await fetch("/api/usecases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          projectId: newUseCase.projectId,
          name: newUseCase.name,
          steps: { platform: "web", code: "" },
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to create use case');
      }
      const newTestCase = await res.json();
      router.push(`/${params.locale}/${params.tenant}/development/usecases/edit/${newTestCase.id}`);
      setIsCreateDialogOpen(false);
      setNewUseCase({ projectId: "", name: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create use case');
    }
  };

  const handleDelete = async (useCaseId: string) => {
    try {
      const res = await fetch(`/api/usecases/${useCaseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.accessToken}` },
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
      <div className="flex-1 p-6 overflow-hidden">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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
                      router.push(`/${params.locale}/${params.tenant}/development/usecases/edit/${selectedUseCase.id}`)
                    }
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 