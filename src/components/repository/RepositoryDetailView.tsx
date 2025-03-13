import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  ArrowLeft, GitBranch, RefreshCw, FolderTree, Code, Play, 
  Settings, Terminal, FileCode, Folder, Star, GitFork, Eye, 
  ChevronDown, Download, History, PlusCircle, FileText
} from 'lucide-react';

import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Badge } from '@/components/shadcn/badge';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/icons';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbSeparator 
} from '@/components/ui/Breadcrumb';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shadcn/tooltip';
import { cn } from '@/lib/utils';

// File extension colors for syntax highlighting
const FILE_EXTENSION_COLORS = {
  js: "text-yellow-500",
  jsx: "text-blue-400",
  ts: "text-blue-500",
  tsx: "text-blue-600",
  css: "text-pink-500",
  scss: "text-pink-600",
  html: "text-orange-500",
  json: "text-green-500",
  md: "text-purple-500",
  py: "text-green-600",
  rb: "text-red-500",
  go: "text-cyan-500",
  java: "text-amber-500",
  php: "text-indigo-500",
  c: "text-blue-800",
  cpp: "text-blue-700",
  cs: "text-violet-500",
  rs: "text-orange-600",
  swift: "text-orange-500",
  kt: "text-purple-600",
  default: "text-gray-500"
};

interface RepositoryDetailViewProps {
  repository: any; // We'll replace this with proper types later
  onBack: () => void;
}

export function RepositoryDetailView({ repository, onBack }: RepositoryDetailViewProps) {
  const t = useTranslations('repositories');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('code');
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

  // Get provider icon and name
  const getProviderIcon = () => {
    switch(repository.providerType) {
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
  
  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || 'default';
    const colorClass = FILE_EXTENSION_COLORS[extension as keyof typeof FILE_EXTENSION_COLORS] || FILE_EXTENSION_COLORS.default;
    
    return <FileCode className={`h-4 w-4 ${colorClass}`} />;
  };

  // Fetch repository files
  useEffect(() => {
    const fetchFiles = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const path = currentPath.join('/');
        const response = await fetch(`/api/repositories/${repository.id}/files?path=${path}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch repository files');
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          setFiles(data.data);
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
  }, [repository.id, currentPath]);

  // Navigate through repository files
  const handleNavigate = async (item: any, isFolder = false) => {
    if (isFolder) {
      setCurrentPath([...currentPath, item.name]);
      setSelectedFile(null);
      setFileContent('');
    } else {
      setSelectedFile(item.path);
      
      try {
        const response = await fetch(`/api/repositories/${repository.id}/file-content?path=${item.path}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch file content');
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          setFileContent(data.data.content);
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

  // Refresh current directory
  const handleRefresh = () => {
    // Re-fetch the current directory
    const fetchFiles = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const path = currentPath.join('/');
        const response = await fetch(`/api/repositories/${repository.id}/files?path=${path}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch repository files');
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          setFiles(data.data);
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
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
    
    return (
      <div className="space-y-0.5">
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
            onClick={() => handleNavigate(item, item.type === 'folder')}
          >
            {item.type === 'folder' ? (
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
    return (
      <Breadcrumb>
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
    <div className="space-y-0">
      {/* Integrated header with back button, repo info, and actions */}
      <div className="flex flex-col space-y-1 mb-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="text-sm">{t('back')}</span>
            </Button>
            
            <div className="flex items-center">
              {getProviderIcon()}
              <span className="ml-2 font-semibold">{repository.owner} / {repository.name}</span>
              {repository.isPrivate && (
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
                  <Button variant="outline" size="sm" className="h-8" onClick={handleRefresh}>
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
        <div className="flex items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent h-10 p-0">
              <TabsTrigger 
                value="code" 
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 h-10 data-[state=active]:border-primary data-[state=active]:bg-transparent",
                  activeTab === 'code' ? "border-primary" : "border-transparent"
                )}
              >
                <Code className="h-4 w-4 mr-2" />
                <span>Code</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="issues" 
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 h-10 data-[state=active]:border-primary data-[state=active]:bg-transparent",
                  activeTab === 'issues' ? "border-primary" : "border-transparent"
                )}
              >
                <span>Issues</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="prs" 
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 h-10 data-[state=active]:border-primary data-[state=active]:bg-transparent",
                  activeTab === 'prs' ? "border-primary" : "border-transparent"
                )}
              >
                <span>Pull Requests</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="actions" 
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 h-10 data-[state=active]:border-primary data-[state=active]:bg-transparent",
                  activeTab === 'actions' ? "border-primary" : "border-transparent"
                )}
              >
                <Play className="h-4 w-4 mr-2" />
                <span>Actions</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="settings" 
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 h-10 data-[state=active]:border-primary data-[state=active]:bg-transparent",
                  activeTab === 'settings' ? "border-primary" : "border-transparent"
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
      <div>
        {activeTab === 'code' && (
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
            <Card className="border shadow-sm">
              <CardContent className="p-0">
                <div className="flex flex-col">
                  {/* Branch selector and actions */}
                  <div className="flex justify-between items-center p-3 bg-muted/50 border-b">
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
                  <div className="px-4 py-2 border-b">
                    {renderBreadcrumb()}
                  </div>
                  
                  {/* File explorer and content */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
                    <div className="md:col-span-1 border-r">
                      <ScrollArea className="h-[500px]">
                        {renderFileList()}
                      </ScrollArea>
                    </div>
                    
                    <div className="md:col-span-3">
                      <div className="flex justify-between items-center p-2 border-b bg-muted/30">
                        <div>
                          {selectedFile ? (
                            <div className="flex items-center text-sm">
                              <FileCode className="h-4 w-4 mr-2" />
                              <span className="font-medium">{selectedFile.split('/').pop()}</span>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              {t('selectFile')}
                            </div>
                          )}
                        </div>
                        
                        {selectedFile && (
                          <div className="flex items-center">
                            <Button 
                              variant={viewMode === 'code' ? 'secondary' : 'ghost'} 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => setViewMode('code')}
                            >
                              <Code className="h-3.5 w-3.5 mr-1" />
                              <span>Code</span>
                            </Button>
                            <Button 
                              variant={viewMode === 'preview' ? 'secondary' : 'ghost'} 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => setViewMode('preview')}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              <span>Preview</span>
                            </Button>
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
        
        {activeTab !== 'code' && (
          <Alert className="mb-4">
            <AlertDescription>{t('featureNotImplemented')}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
