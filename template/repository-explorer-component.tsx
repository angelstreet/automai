import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitBranch, 
  Search, 
  Code, 
  Play, 
  Plus, 
  FolderTree, 
  Settings, 
  TerminalSquare,
  FileCode,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Sample data, in a real app this would come from the backend
const SAMPLE_REPOSITORIES = [
  { 
    id: '1', 
    name: 'ci-scripts', 
    description: 'Common CI/CD pipeline scripts',
    provider: 'github',
    lastUpdated: '2025-02-15T12:00:00Z',
    branch: 'main',
    language: 'Python',
    stars: 12
  },
  { 
    id: '2', 
    name: 'system-utils', 
    description: 'System monitoring and maintenance scripts',
    provider: 'gitlab',
    lastUpdated: '2025-03-01T10:30:00Z',
    branch: 'master',
    language: 'Bash',
    stars: 8
  },
  { 
    id: '3', 
    name: 'data-transforms', 
    description: 'ETL scripts for data processing',
    provider: 'github',
    lastUpdated: '2025-03-05T15:45:00Z',
    branch: 'main',
    language: 'Python',
    stars: 24
  }
];

// Sample file structure for a repository
const SAMPLE_FILES = {
  'src': {
    type: 'folder',
    children: {
      'main.py': { type: 'file', size: '4.2 KB', lastModified: '2025-02-28' },
      'utils': {
        type: 'folder',
        children: {
          'helpers.py': { type: 'file', size: '2.8 KB', lastModified: '2025-02-15' },
          'config.py': { type: 'file', size: '1.5 KB', lastModified: '2025-02-20' }
        }
      }
    }
  },
  'tests': {
    type: 'folder',
    children: {
      'test_main.py': { type: 'file', size: '3.1 KB', lastModified: '2025-02-25' }
    }
  },
  'README.md': { type: 'file', size: '8.5 KB', lastModified: '2025-03-01' },
  'requirements.txt': { type: 'file', size: '0.5 KB', lastModified: '2025-02-10' }
};

// Sample file content
const SAMPLE_FILE_CONTENT = `#!/usr/bin/env python3
import argparse
import logging
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Process some data.')
    parser.add_argument('--input', type=str, required=True, help='Input file path')
    parser.add_argument('--output', type=str, required=True, help='Output file path')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    
    return parser.parse_args()

def main():
    """Main entry point of the script."""
    args = parse_arguments()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    logger.info(f"Processing input file: {args.input}")
    input_path = Path(args.input)
    output_path = Path(args.output)
    
    if not input_path.exists():
        logger.error(f"Input file does not exist: {args.input}")
        return 1
    
    # Process the file
    try:
        with open(input_path, 'r') as f_in, open(output_path, 'w') as f_out:
            for line in f_in:
                # Example processing: convert to uppercase
                processed_line = line.upper()
                f_out.write(processed_line)
        
        logger.info(f"Successfully processed file and saved to: {args.output}")
        return 0
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
`;

// Sample available runners
const SAMPLE_RUNNERS = [
  { id: 'runner1', name: 'Python Runner', status: 'available', type: 'docker', tags: ['python3.10', 'linux'] },
  { id: 'runner2', name: 'Bash Runner', status: 'available', type: 'ssh', tags: ['bash', 'linux', 'ubuntu'] },
  { id: 'runner3', name: 'Data Processing Node', status: 'busy', type: 'ssh', tags: ['python3.9', 'pandas', 'linux'] },
  { id: 'runner4', name: 'Windows Node', status: 'available', type: 'ssh', tags: ['windows', 'powershell'] }
];

// File icon mapping
const getFileIcon = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  
  switch(extension) {
    case 'py':
      return <FileCode className="text-blue-500" />;
    case 'sh':
      return <TerminalSquare className="text-green-500" />;
    case 'md':
      return <FileCode className="text-gray-500" />;
    case 'txt':
      return <FileCode className="text-gray-400" />;
    default:
      return <FileCode />;
  }
};

// Simple notification component to replace toast
const Notification = ({ type, message, onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400';
  const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  
  return (
    <div className={`fixed top-4 right-4 w-80 p-4 rounded-md shadow-md border ${bgColor} z-50`}>
      <div className="flex items-start">
        <Icon className={`h-5 w-5 mr-2 ${textColor}`} />
        <div className="flex-1">
          <p className={`font-medium ${textColor}`}>
            {type === 'success' ? 'Success' : 'Error'}
          </p>
          <p className={`text-sm ${textColor}`}>{message}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Repository Explorer Component
export default function RepositoryExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [currentPath, setCurrentPath] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedRunner, setSelectedRunner] = useState(null);
  const [executionOutput, setExecutionOutput] = useState('');
  const [notification, setNotification] = useState(null);
  
  // Fix missing X icon component
  const X = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18"></path>
      <path d="m6 6 12 12"></path>
    </svg>
  );

  // Simple notification handler to replace toast
  const showNotification = (type, message) => {
    setNotification({ type, message });
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Filter repositories based on search query
  const filteredRepos = SAMPLE_REPOSITORIES.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Select a repository
  const handleSelectRepo = (repo) => {
    setSelectedRepo(repo);
    setCurrentPath([]);
    setSelectedFile(null);
    setFileContent('');
    setExecutionOutput('');
  };

  // Navigate through repository files
  const handleNavigate = (item, itemName, isFolder = false) => {
    if (isFolder) {
      setCurrentPath([...currentPath, itemName]);
      setSelectedFile(null);
      setFileContent('');
    } else {
      setSelectedFile(currentPath.length > 0 ? `${currentPath.join('/')}/${itemName}` : itemName);
      // In a real app, you would fetch the file content here
      setFileContent(SAMPLE_FILE_CONTENT);
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

  // Get current directory based on path
  const getCurrentDirectory = () => {
    let current = SAMPLE_FILES;
    for (const dir of currentPath) {
      if (current[dir] && current[dir].type === 'folder') {
        current = current[dir].children;
      } else {
        return {};
      }
    }
    return current;
  };

  // Execute selected script
  const handleExecuteScript = () => {
    if (!selectedFile) {
      showNotification('error', "Please select a file to execute");
      return;
    }

    if (!selectedRunner) {
      showNotification('error', "Please select a runner to execute the script");
      return;
    }

    setIsExecuting(true);
    
    // Simulate execution - in a real app, this would call an API
    setTimeout(() => {
      setExecutionOutput(`Running ${selectedFile} on ${selectedRunner.name}...
      
[INFO] Cloning repository ${selectedRepo.name}...
[INFO] Checkout branch ${selectedRepo.branch}...
[INFO] Setting up environment...
[INFO] Installing dependencies...
[INFO] Running script...

Processing input file: sample_data.txt
Successfully processed file and saved to: output.txt

[INFO] Execution completed successfully.
      `);
      setIsExecuting(false);
      
      showNotification('success', `Script executed successfully on ${selectedRunner.name}`);
    }, 2000);
  };

  // Clone repository to a runner
  const handleCloneRepository = () => {
    if (!selectedRepo) {
      showNotification('error', "Please select a repository first");
      return;
    }

    if (!selectedRunner) {
      showNotification('error', "Please select a runner to clone the repository");
      return;
    }

    showNotification('success', `Cloning ${selectedRepo.name} to ${selectedRunner.name}...`);

    // In a real app, this would call an API
    setTimeout(() => {
      showNotification('success', `Repository cloned successfully to ${selectedRunner.name}`);
    }, 1500);
  };

  return (
    <div className="flex flex-col space-y-4">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Repository Explorer</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Connect Repository
        </Button>
      </div>
      
      <div className="grid gap-4 grid-cols-12">
        {/* Left Panel - Repository List */}
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Repositories</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-13rem)] pr-3">
              <div className="space-y-2 p-3">
                {filteredRepos.map(repo => (
                  <div
                    key={repo.id}
                    onClick={() => handleSelectRepo(repo)}
                    className={`flex flex-col p-3 rounded-md cursor-pointer hover:bg-muted transition duration-200 ease-in-out ${selectedRepo?.id === repo.id ? 'bg-muted border border-border' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{repo.name}</div>
                      <Badge variant="outline" className="ml-auto">
                        {repo.provider}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {repo.description}
                    </div>
                    <div className="flex items-center mt-2 text-xs text-muted-foreground">
                      <GitBranch className="h-3 w-3 mr-1" />
                      {repo.branch}
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {repo.language}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Main Content */}
        <div className="col-span-9 space-y-4">
          {selectedRepo ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedRepo.name}</CardTitle>
                    <CardDescription>{selectedRepo.description}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Clone
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="files">
                  <div className="border-b px-3">
                    <TabsList className="!px-0">
                      <TabsTrigger value="files" className="relative">
                        <FolderTree className="h-4 w-4 mr-2" />
                        Files
                      </TabsTrigger>
                      <TabsTrigger value="execute">
                        <Play className="h-4 w-4 mr-2" />
                        Execute
                      </TabsTrigger>
                      <TabsTrigger value="settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  {/* Files Tab */}
                  <TabsContent value="files" className="m-0">
                    <div className="grid grid-cols-5 h-[calc(100vh-15rem)]">
                      {/* File Explorer */}
                      <div className="col-span-1 border-r p-3">
                        <div className="flex items-center mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleNavigateUp}
                            disabled={currentPath.length === 0}
                          >
                            Go Up
                          </Button>
                          <span className="ml-2 text-sm text-muted-foreground">
                            /{currentPath.join('/')}
                          </span>
                        </div>
                        <ScrollArea className="h-[calc(100vh-18rem)]">
                          <div className="space-y-1">
                            {Object.entries(getCurrentDirectory()).map(([name, item]) => (
                              <div
                                key={name}
                                onClick={() => handleNavigate(item, name, item.type === 'folder')}
                                className="flex items-center p-2 rounded-md cursor-pointer hover:bg-muted transition-colors"
                              >
                                {item.type === 'folder' ? (
                                  <FolderTree className="h-4 w-4 mr-2 text-blue-500" />
                                ) : (
                                  getFileIcon(name)
                                )}
                                <span className="text-sm">{name}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                      
                      {/* File Content */}
                      <div className="col-span-4 p-3">
                        {selectedFile ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {getFileIcon(selectedFile)}
                                <span className="ml-2 font-medium">{selectedFile}</span>
                              </div>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={handleExecuteScript}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Execute
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </div>
                            <Separator />
                            <ScrollArea className="h-[calc(100vh-23rem)] w-full rounded-md border p-4 bg-slate-950">
                              <pre className="text-sm text-white font-mono">
                                <code>{fileContent}</code>
                              </pre>
                            </ScrollArea>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <Code className="h-16 w-16 mx-auto text-muted-foreground" />
                              <p className="mt-2 text-muted-foreground">
                                Select a file to view its content
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* Execute Tab */}
                  <TabsContent value="execute" className="m-0 p-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1 space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Selected File</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {selectedFile ? (
                              <div className="flex items-center">
                                {getFileIcon(selectedFile)}
                                <span className="ml-2">{selectedFile}</span>
                              </div>
                            ) : (
                              <p className="text-muted-foreground">No file selected</p>
                            )}
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader>
                            <CardTitle>Available Runners</CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <ScrollArea className="h-64">
                              <div className="space-y-2 p-3">
                                {SAMPLE_RUNNERS.map(runner => (
                                  <div
                                    key={runner.id}
                                    onClick={() => setSelectedRunner(runner)}
                                    className={`flex flex-col p-3 rounded-md cursor-pointer hover:bg-muted transition duration-200 ${
                                      selectedRunner?.id === runner.id ? 'bg-muted border border-border' : ''
                                    } ${runner.status === 'busy' ? 'opacity-50' : ''}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="font-medium">{runner.name}</div>
                                      <Badge className={runner.status === 'available' ? 'bg-green-500' : 'bg-gray-400'}>
                                        {runner.status}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      Type: {runner.type}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {runner.tags.map(tag => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                        
                        <div className="flex space-x-2">
                          <Button 
                            onClick={handleExecuteScript} 
                            disabled={isExecuting || !selectedFile || !selectedRunner}
                            className="flex-1"
                          >
                            {isExecuting ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Executing...
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Execute Script
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={handleCloneRepository}
                            disabled={!selectedRepo || !selectedRunner}
                            className="flex-1"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Clone Repo
                          </Button>
                        </div>
                      </div>
                      
                      <div className="col-span-2">
                        <Card className="h-full">
                          <CardHeader>
                            <CardTitle>Execution Output</CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <ScrollArea className="h-[calc(100vh-22rem)] w-full rounded-md border">
                              <pre className="p-4 text-sm font-mono">
                                {executionOutput || 'No execution output yet. Run a script to see output here.'}
                              </pre>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* Settings Tab */}
                  <TabsContent value="settings" className="m-0 p-3">
                    <Card>
                      <CardHeader>
                        <CardTitle>Repository Settings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Repository Name</label>
                              <Input value={selectedRepo.name} disabled />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Provider</label>
                              <Input value={selectedRepo.provider} disabled />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Default Branch</label>
                              <Input value={selectedRepo.branch} />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Language</label>
                              <Input value={selectedRepo.language} disabled />
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">Description</label>
                            <Input value={selectedRepo.description} />
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline">Cancel</Button>
                            <Button>Save Changes</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[calc(100vh-10rem)]">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <GitBranch className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h2 className="mt-4 text-xl font-semibold">No Repository Selected</h2>
                  <p className="mt-2 text-muted-foreground max-w-md">
                    Select a repository from the sidebar to view files, execute scripts, or configure settings.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
