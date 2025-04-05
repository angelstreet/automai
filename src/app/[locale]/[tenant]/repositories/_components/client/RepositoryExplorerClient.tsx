'use client';

import {
  ArrowLeft,
  GitBranch,
  FolderTree,
  Code,
  Play,
  Settings,
  FileCode,
  Folder,
  Star,
  ChevronDown,
  Download,
  History,
  PlusCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/icons';
import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/Breadcrumb';
import { cn } from '@/lib/utils';
import { RepositoryFile } from '@/types/component/repositoryComponentType';
import {
  RepositoryExplorerProps,
  FilesAPIResponse,
  FileAPIResponse,
} from '@/types/context/repositoryContextType';

import { FILE_EXTENSION_COLORS, EXPLORER_TABS } from '../../constants';

export function RepositoryExplorerClient({ repository, onBack }: RepositoryExplorerProps) {
  const t = useTranslations('repositories');
  const c = useTranslations('common');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(EXPLORER_TABS.CODE);

  // Validate repository has required properties
  const isValidRepository =
    repository &&
    repository.id &&
    (repository.providerId || repository.provider_id) &&
    repository.url &&
    repository.name &&
    repository.owner;

  // Add debugging - log the repository object
  useEffect(() => {
    if (repository) {
      console.log('[RepositoryExplorer] Repository data received:', {
        id: repository.id,
        name: repository.name,
        owner: repository.owner,
        url: repository.url,
        providerId: repository.providerId || repository.provider_id,
        providerType: repository.providerType,
        isValid: isValidRepository,
      });
    } else {
      console.log('[RepositoryExplorer] No repository data provided');
    }
  }, [repository, isValidRepository]);

  // Get provider icon and name
  const getProviderIcon = () => {
    switch (repository?.providerType) {
      case 'github':
        return <GitHubIcon className="h-5 w-5" />;
      case 'gitlab':
        return <GitLabIcon className="h-5 w-5" />;
      case 'gitea':
        return <GiteaIcon className="h-5 w-5" />;
      default:
        return <GitBranch className="h-5 w-5" />;
    }
  };

  // Get file icon based on extension using constants
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || 'default';
    const colorClass = FILE_EXTENSION_COLORS[extension] || FILE_EXTENSION_COLORS.default;

    return <FileCode className={`h-4 w-4 ${colorClass}`} />;
  };

  // Navigate through repository files
  const handleNavigate = async (item: RepositoryFile, isFolder = false) => {
    // Check if repository data is valid before navigating
    if (!isValidRepository) {
      setError('Repository data is not fully loaded yet. Please wait...');
      console.log('[RepositoryExplorer] Cannot navigate, repository data not valid:', repository);
      return;
    }

    if (isFolder) {
      setCurrentPath([...currentPath, item.name]);
      setSelectedFile(null);
      setFileContent('');
    } else {
      setSelectedFile(item.path);
      setFileContent('Loading file content...');

      try {
        // Use the providerId directly from the repository object
        const providerId = repository.providerId || repository.provider_id;

        console.log('[RepositoryExplorer] Fetching file content with params:', {
          repositoryId: repository.id,
          providerId,
          url: repository.url,
          path: item.path,
        });

        // Ensure all parameters are strings
        const repoId = repository.id;
        const repoUrl = repository.url || '';
        const filePath = item.path || '';

        // Try multiple branch names since we don't know the default branch
        const branchesToTry = ['master', 'main', 'develop', 'dev'];
        let content = null;
        let lastError = null;

        for (const branch of branchesToTry) {
          try {
            const apiUrl = `/api/repositories/explore?repositoryId=${repoId}&providerId=${providerId}&repositoryUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(filePath)}&branch=${branch}&action=file`;

            console.log(`[RepositoryExplorer] Trying branch: ${branch}`);
            const response = await fetch(apiUrl);

            if (response.ok) {
              const data = (await response.json()) as FileAPIResponse;

              if (data.success && data.data) {
                // Decode base64 content if needed
                if (data.data.encoding === 'base64' && data.data.content) {
                  const decodedContent = atob(data.data.content);
                  setFileContent(decodedContent);
                } else {
                  setFileContent(data.data.content || 'No content available');
                }
                console.log(`[RepositoryExplorer] Successfully loaded file with branch: ${branch}`);
                content = data;
                break;
              }
            } else {
              const errorText = await response.text();
              console.log(`[RepositoryExplorer] Failed with branch ${branch}:`, errorText);
              lastError = new Error(
                `Error with branch ${branch}: ${response.status} ${response.statusText}`,
              );
            }
          } catch (branchError: any) {
            console.error(`[RepositoryExplorer] Error with branch ${branch}:`, branchError);
            lastError = branchError;
          }
        }

        if (!content && lastError) {
          throw lastError;
        }
      } catch (error: any) {
        console.error('[RepositoryExplorer] Error fetching file content:', error);
        setFileContent(
          `Error loading file: ${error.message}\n\nThis could be due to:\n- Authentication issues with the repository\n- The file might not exist\n- API rate limiting\n- The file may be in a different branch than we tried (master, main, develop, dev)`,
        );
      }
    }
  };

  // Load repository files
  useEffect(() => {
    // Skip if repository is not valid yet
    if (!isValidRepository) {
      setIsLoading(true);
      setError('Repository data is loading...');
      console.log('[RepositoryExplorer] Repository data is not valid yet:', repository);
      return;
    }

    const fetchFiles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const pathString = currentPath.join('/');

        // Use the providerId directly from the repository object
        const providerId = repository.providerId || repository.provider_id;

        console.log('[RepositoryExplorer] Fetching files with params:', {
          repositoryId: repository.id,
          providerId,
          url: repository.url,
          path: pathString,
        });

        // Ensure all parameters are strings
        const repoId = repository.id;
        const repoUrl = repository.url || '';
        const safePath = pathString || '';

        // Try multiple branch names since we don't know the default branch
        const branchesToTry = ['master', 'main', 'develop', 'dev'];
        let files = null;
        let lastError = null;

        for (const branch of branchesToTry) {
          try {
            const apiUrl = `/api/repositories/explore?repositoryId=${repoId}&providerId=${providerId}&repositoryUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(safePath)}&branch=${branch}&action=list`;

            console.log(`[RepositoryExplorer] Trying to list files with branch: ${branch}`);
            const response = await fetch(apiUrl);

            if (response.ok) {
              const data = (await response.json()) as FilesAPIResponse;

              if (data.success && data.data) {
                // Sort files: directories first, then files, both alphabetically
                const sortedFiles = [...data.data].sort((a, b) => {
                  if (a.type === 'dir' && b.type !== 'dir') return -1;
                  if (a.type !== 'dir' && b.type === 'dir') return 1;
                  return a.name.localeCompare(b.name);
                });

                console.log(
                  `[RepositoryExplorer] Successfully loaded file list with branch: ${branch}`,
                );
                setFiles(sortedFiles);
                files = data;
                break;
              }
            } else {
              const errorText = await response.text();
              console.log(
                `[RepositoryExplorer] Failed to list files with branch ${branch}:`,
                errorText,
              );
              lastError = new Error(
                `Error with branch ${branch}: ${response.status} ${response.statusText}`,
              );
            }
          } catch (branchError: any) {
            console.error(
              `[RepositoryExplorer] Error listing files with branch ${branch}:`,
              branchError,
            );
            lastError = branchError;
          }
        }

        if (!files && lastError) {
          throw lastError;
        }
      } catch (error: any) {
        console.error('[RepositoryExplorer] Error fetching repository files:', error);
        setError(
          error.message ||
            'Failed to fetch repository files. The repository may not be accessible or the branch names we tried (master, main, develop, dev) are not available.',
        );
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [
    repository.id,
    repository.providerId,
    repository.provider_id,
    repository.url,
    currentPath,
    isValidRepository,
    repository,
  ]);

  // Go up one directory
  const handleNavigateUp = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
      setSelectedFile(null);
      setFileContent('');
    }
  };

  // Navigate to specific path in breadcrumb
  const handleBreadcrumbNavigate = (index: number) => {
    setCurrentPath(currentPath.slice(0, index));
    setSelectedFile(null);
    setFileContent('');
  };

  // Render file list
  const renderFileList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (files.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <FolderTree className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('empty_directory')}</p>
          </div>
        </div>
      );
    }

    // Sort files: folders first, then files alphabetically
    const sortedFiles = [...files].sort((a, b) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <div className="space-y-0 text-xs">
        {currentPath.length > 0 && (
          <div
            className="flex items-center p-1.5 rounded-md hover:bg-muted cursor-pointer"
            onClick={handleNavigateUp}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            <span>../</span>
          </div>
        )}

        {sortedFiles.map((item, index) => (
          <div
            key={index}
            className="flex items-center py-0.5 px-1.5 rounded-md hover:bg-muted cursor-pointer"
            onClick={() => handleNavigate(item, item.type === 'dir')}
          >
            {item.type === 'dir' ? (
              <Folder className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
            ) : (
              <span className="mr-1.5">{getFileIcon(item.name)}</span>
            )}
            <span className="truncate">{item.name}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render breadcrumb navigation
  const renderBreadcrumb = () => {
    if (!isValidRepository) {
      return (
        <Breadcrumb className="mb-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>
                <Folder className="h-3 w-3 mr-1 inline" />
                Loading...
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
    }

    return (
      <Breadcrumb className="mb-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => setCurrentPath([])}>
              <Folder className="h-3 w-3 mr-1 inline" />
              {repository.name}
            </BreadcrumbLink>
          </BreadcrumbItem>

          {currentPath.map((path, index) => (
            <BreadcrumbItem key={index}>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbLink onClick={() => handleBreadcrumbNavigate(index + 1)}>
                {path}
              </BreadcrumbLink>
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  // Handle refresh button click
  const handleRefresh = () => {
    // If a file is selected, reload the file content
    if (selectedFile) {
      const matchingFile = files.find((f) => f.path === selectedFile);
      if (matchingFile) {
        handleNavigate(matchingFile, matchingFile.type === 'dir');
      }
    } else {
      // Otherwise reload the file list
      setFiles([]);
      setIsLoading(true);
      // This will trigger the useEffect to refetch the files
      const pathCopy = [...currentPath];
      setCurrentPath([]);
      setTimeout(() => setCurrentPath(pathCopy), 100);
    }
  };

  return (
    <div className="space-y-1">
      {/* GitHub-style header */}
      <div className="flex flex-col space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-7 text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              <span>{c('back')}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Star className="h-3.5 w-3.5 mr-1" />
              <span>Star</span>
            </Button>
          </div>
        </div>

        {/* GitHub-style tabs */}
        <div className="border-b flex items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent h-8 p-0">
              <TabsTrigger
                value={EXPLORER_TABS.CODE}
                className={cn(
                  'rounded-none border-b-2 border-transparent px-3 h-8 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent',
                  activeTab === EXPLORER_TABS.CODE ? 'border-primary' : 'border-transparent',
                )}
              >
                <Code className="h-3.5 w-3.5 mr-1.5" />
                <span>Code</span>
              </TabsTrigger>

              <TabsTrigger
                value={EXPLORER_TABS.ISSUES}
                className={cn(
                  'rounded-none border-b-2 border-transparent px-3 h-8 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent',
                  activeTab === EXPLORER_TABS.ISSUES ? 'border-primary' : 'border-transparent',
                )}
              >
                <span>Issues</span>
              </TabsTrigger>

              <TabsTrigger
                value={EXPLORER_TABS.PULL_REQUESTS}
                className={cn(
                  'rounded-none border-b-2 border-transparent px-3 h-8 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent',
                  activeTab === EXPLORER_TABS.PULL_REQUESTS
                    ? 'border-primary'
                    : 'border-transparent',
                )}
              >
                <span>Pull Requests</span>
              </TabsTrigger>

              <TabsTrigger
                value={EXPLORER_TABS.ACTIONS}
                className={cn(
                  'rounded-none border-b-2 border-transparent px-3 h-8 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent',
                  activeTab === EXPLORER_TABS.ACTIONS ? 'border-primary' : 'border-transparent',
                )}
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                <span>Actions</span>
              </TabsTrigger>

              <TabsTrigger
                value={EXPLORER_TABS.SETTINGS}
                className={cn(
                  'rounded-none border-b-2 border-transparent px-3 h-8 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent',
                  activeTab === EXPLORER_TABS.SETTINGS ? 'border-primary' : 'border-transparent',
                )}
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main content area */}
      <div className="mt-2">
        {activeTab === EXPLORER_TABS.CODE && (
          <div className="space-y-1">
            {/* GitHub-style file explorer */}
            <Card className="border-none shadow-none">
              <CardContent className="p-0">
                <div className="flex flex-col">
                  {/* Branch selector and actions */}
                  <div className="flex justify-between items-center p-2 bg-muted/50 border rounded-t-md">
                    <div className="flex items-center">
                      <Button variant="outline" size="sm" className="h-6 text-xs">
                        <GitBranch className="h-3 w-3 mr-1" />
                        <span>main</span>
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button variant="outline" size="sm" className="h-6 text-xs">
                        <History className="h-3 w-3 mr-1" />
                        <span>Commits</span>
                      </Button>

                      <Button variant="outline" size="sm" className="h-6 text-xs">
                        <Download className="h-3 w-3 mr-1" />
                        <span>Download</span>
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>

                      <Button variant="outline" size="sm" className="h-6 text-xs">
                        <PlusCircle className="h-3 w-3 mr-1" />
                        <span>Add file</span>
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  {/* Breadcrumb navigation */}
                  <div className="px-2 py-1 border-x text-xs">{renderBreadcrumb()}</div>

                  {/* File explorer and content */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-x border-b rounded-b-md">
                    <div className="md:col-span-1 border-r">
                      <ScrollArea className="h-[520px]">{renderFileList()}</ScrollArea>
                    </div>

                    <div className="md:col-span-3">
                      <div className="p-1.5 border-b bg-muted/30">
                        {selectedFile ? (
                          <div className="flex items-center text-xs">
                            <FileCode className="h-3.5 w-3.5 mr-1.5" />
                            <span className="font-medium">
                              {selectedFile?.split('/').pop() || 'File'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">{t('select_file')}</div>
                        )}
                      </div>

                      <ScrollArea className="h-[520px]">
                        {selectedFile ? (
                          <pre className="text-xs leading-tight p-3 bg-muted/20 rounded-md overflow-x-auto">
                            {fileContent || t('loading')}
                          </pre>
                        ) : (
                          <div className="flex justify-center items-center h-64">
                            <div className="text-center">
                              <FileCode className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-xs text-muted-foreground">{t('select_file')}</p>
                            </div>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab !== EXPLORER_TABS.CODE && (
          <Alert className="mb-4">
            <AlertDescription>{t('feature_not_implemented')}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
