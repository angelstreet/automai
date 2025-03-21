import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  ArrowLeft, GitBranch, RefreshCw, FolderTree, Code, Play, 
  Settings, Terminal, FileCode, Folder, Star, GitFork, Eye, 
  ChevronRight, ChevronDown, Download, History, PlusCircle
} from 'lucide-react';
import { useRepository } from '@/context';

import {
  Card,
  CardContent,
} from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Badge } from '@/components/shadcn/badge';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/icons';
import { FILE_EXTENSION_COLORS, EXPLORER_TABS } from '../constants';
import { 
  RepositoryExplorerProps, 
  RepositoryFile, 
  FilesAPIResponse, 
  FileAPIResponse 
} from '../types';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbSeparator 
} from '@/components/ui/Breadcrumb';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shadcn/tooltip';
import { cn } from '@/lib/utils';

export function RepositoryExplorer({ repository, onBack }: RepositoryExplorerProps) {
  const t = useTranslations('repositories');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(EXPLORER_TABS.CODE);
  
  // Validate repository has required properties
  const isValidRepository = repository && 
    repository.id && 
    repository.providerId && 
    repository.url &&
    repository.name &&
    repository.owner;

  // Get provider icon and name
  const getProviderIcon = () => {
    switch(repository?.providerType) {
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
  
  const getProviderName = () => {
    switch(repository?.providerType) {
      case 'github':
        return 'GitHub';
      case 'gitlab':
        return 'GitLab';
      case 'gitea':
        return 'Gitea';
      default:
        return 'Git';
    }
  };

  // Get file icon based on extension using constants
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || 'default';
    const colorClass = FILE_EXTENSION_COLORS[extension] || FILE_EXTENSION_COLORS.default;
    
    return <FileCode className={`h-4 w-4 ${colorClass}`} />;
  };

  // Load repository files
  useEffect(() => {
    // Skip if repository is not valid yet
    if (!isValidRepository) {
      setIsLoading(true);
      setError('Repository data is loading...');
      return;
    }
    
    const fetchFiles = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const pathString = currentPath.join('/');
        const url = `/api/repositories/explore?repositoryId=${repository.id}&providerId=${repository.providerId}&repositoryUrl=${encodeURIComponent(repository.url)}&path=${encodeURIComponent(pathString)}&action=list`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch repository files');
        }
        
        const data = await response.json() as FilesAPIResponse;
        
        if (data.success && data.data) {
          // Sort files: directories first, then files, both alphabetically
          const sortedFiles = [...data.data].sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            return a.name.localeCompare(b.name);
          });
          
          setFiles(sortedFiles);
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (error: any) {
        console.error('Error fetching repository files:', error);
        setError(error.message || 'Failed to fetch repository files');
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFiles();
  }, [repository?.id, repository?.providerId, repository?.url, currentPath, isValidRepository]);

  // Navigate through repository files
  const handleNavigate = async (item: RepositoryFile, isFolder = false) => {
    // Check if repository data is valid before navigating
    if (!isValidRepository) {
      setError('Repository data is not fully loaded yet. Please wait...');
      return;
    }
    
    if (isFolder) {
      setCurrentPath([...currentPath, item.name]);
      setSelectedFile(null);
      setFileContent('');
    } else {
      setSelectedFile(item.path);
      
      try {
        const url = `/api/repositories/explore?repositoryId=${repository.id}&providerId=${repository.providerId}&repositoryUrl=${encodeURIComponent(repository.url)}&path=${encodeURIComponent(item.path)}&action=file`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch file content');
        }
        
        const data = await response.json() as FileAPIResponse;
        
        if (data.success && data.data) {
          // Decode base64 content if needed
          if (data.data.encoding === 'base64' && data.data.content) {
            const decodedContent = atob(data.data.content);
            setFileContent(decodedContent);
          } else {
            setFileContent(data.data.content || 'No content available');
          }
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (error: any) {
        console.error('Error fetching file content:', error);
        setFileContent(`Error loading file: ${error.message}`);
      }
    }
  };

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
            <p className="text-muted-foreground">{t('emptyDirectory')}</p>
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
      <div className="space-y-1">
        {currentPath.length > 0 && (
          <div 
            className="flex items-center p-2 rounded-md hover:bg-muted cursor-pointer"
            onClick={handleNavigateUp}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>../</span>
          </div>
        )}
        
        {sortedFiles.map((item, index) => (
          <div 
            key={index}
            className="flex items-center p-2 rounded-md hover:bg-muted cursor-pointer"
            onClick={() => handleNavigate(item, item.type === 'dir')}
          >
            {item.type === 'dir' ? (
              <Folder className="h-4 w-4 mr-2 text-blue-500" />
            ) : (
              <span className="mr-2">{getFileIcon(item.name)}</span>
            )}
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render breadcrumb navigation
  const renderBreadcrumb = () => {
    if (!isValidRepository) {
      return (
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>
                <Folder className="h-4 w-4 mr-1 inline" />
                Loading...
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
    }
    
    return (
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => setCurrentPath([])}>
              <Folder className="h-4 w-4 mr-1 inline" />
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

  return (
    <div className="space-y-2">
      {/* GitHub-style header */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="text-sm">{t('back')}</span>
            </Button>
            
            <div className="flex items-center">
              {getProviderIcon()}
              <span className="ml-2 font-semibold">
                {isValidRepository ? `${repository.owner} / ${repository.name}` : 'Loading...'}
              </span>
              {isValidRepository && repository.isPrivate && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {t('private')}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('refresh')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button variant="outline" size="sm" className="h-8">
              <Star className="h-4 w-4 mr-1" />
              <span className="text-sm">Star</span>
            </Button>
          </div>
        </div>
        
        {/* GitHub-style tabs */}
        <div className="border-b flex items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent h-10 p-0">
              <TabsTrigger 
                value={EXPLORER_TABS.CODE} 
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 h-10 data-[state=active]:border-primary data-[state=active]:bg-transparent",
                  activeTab === EXPLORER_TABS.CODE ? "border-primary" : "border-transparent"
                )}
              >
                <Code className="h-4 w-4 mr-2" />
                <span>Code</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value={EXPLORER_TABS.ISSUES} 
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 h-10 data-[state=active]:border-primary data-[state=active]:bg-transparent",
                  activeTab === EXPLORER_TABS.ISSUES ? "border-primary" : "border-transparent"
                )}
              >
                <span>Issues</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value={EXPLORER_TABS.PULL_REQUESTS} 
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 h-10 data-[state=active]:border-primary data-[state=active]:bg-transparent",
                  activeTab === EXPLORER_TABS.PULL_REQUESTS ? "border-primary" : "border-transparent"
                )}
              >
                <span>Pull Requests</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value={EXPLORER_TABS.ACTIONS} 
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 h-10 data-[state=active]:border-primary data-[state=active]:bg-transparent",
                  activeTab === EXPLORER_TABS.ACTIONS ? "border-primary" : "border-transparent"
                )}
              >
                <Play className="h-4 w-4 mr-2" />
                <span>Actions</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value={EXPLORER_TABS.SETTINGS} 
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 h-10 data-[state=active]:border-primary data-[state=active]:bg-transparent",
                  activeTab === EXPLORER_TABS.SETTINGS ? "border-primary" : "border-transparent"
                )}
              >
                <Settings className="h-4 w-4 mr-2" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="mt-4">
        {activeTab === EXPLORER_TABS.CODE && (
          <div className="space-y-2">
            {/* GitHub-style repository stats */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
              <div className="flex items-center">
                <GitBranch className="h-4 w-4 mr-1" />
                <span>main</span>
              </div>
              
              <div className="flex items-center">
                <GitFork className="h-4 w-4 mr-1" />
                <span>0 forks</span>
              </div>
              
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-1" />
                <span>0 stars</span>
              </div>
              
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                <span>0 watching</span>
              </div>
            </div>
            
            {/* GitHub-style file explorer */}
            <Card className="border-none shadow-none">
              <CardContent className="p-0">
                <div className="flex flex-col">
                  {/* Branch selector and actions */}
                  <div className="flex justify-between items-center p-3 bg-muted/50 border rounded-t-md">
                    <div className="flex items-center">
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <GitBranch className="h-3.5 w-3.5 mr-1" />
                        <span>main</span>
                        <ChevronDown className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <History className="h-3.5 w-3.5 mr-1" />
                        <span>Commits</span>
                      </Button>
                      
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        <span>Download</span>
                        <ChevronDown className="h-3.5 w-3.5 ml-1" />
                      </Button>
                      
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <PlusCircle className="h-3.5 w-3.5 mr-1" />
                        <span>Add file</span>
                        <ChevronDown className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Breadcrumb navigation */}
                  <div className="px-4 py-2 border-x">
                    {renderBreadcrumb()}
                  </div>
                  
                  {/* File explorer and content */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-x border-b rounded-b-md">
                    <div className="md:col-span-1 border-r">
                      <ScrollArea className="h-[500px]">
                        {renderFileList()}
                      </ScrollArea>
                    </div>
                    
                    <div className="md:col-span-3">
                      <div className="p-2 border-b bg-muted/30">
                        {selectedFile ? (
                          <div className="flex items-center text-sm">
                            <FileCode className="h-4 w-4 mr-2" />
                            <span className="font-medium">{selectedFile?.split('/').pop() || 'File'}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {t('selectFile')}
                          </div>
                        )}
                      </div>
                      
                      <ScrollArea className="h-[465px]">
                        {selectedFile ? (
                          <pre className="text-xs p-4 bg-muted/20 rounded-md overflow-x-auto">
                            {fileContent || t('loading')}
                          </pre>
                        ) : (
                          <div className="flex justify-center items-center h-64">
                            <div className="text-center">
                              <FileCode className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">{t('selectFile')}</p>
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
            <AlertDescription>{t('featureNotImplemented')}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}