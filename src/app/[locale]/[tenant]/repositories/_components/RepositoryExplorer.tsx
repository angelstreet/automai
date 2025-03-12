import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, GitBranch, RefreshCw, FolderTree, Code, Play, Settings, Terminal, FileCode } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Badge } from '@/components/shadcn/badge';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/icons';

interface RepositoryExplorerProps {
  repository: any; // We'll replace this with proper types later
  onBack: () => void;
}

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

export function RepositoryExplorer({ repository, onBack }: RepositoryExplorerProps) {
  const t = useTranslations('repositories');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState('');

  // Get provider icon
  const getProviderIcon = () => {
    switch(repository.provider) {
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
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch(extension) {
      case 'py':
        return <FileCode className="text-blue-500" />;
      case 'sh':
        return <Terminal className="text-green-500" />;
      case 'md':
        return <FileCode className="text-gray-500" />;
      case 'txt':
        return <FileCode className="text-gray-400" />;
      default:
        return <FileCode />;
    }
  };

  // Navigate through repository files
  const handleNavigate = (item: any, itemName: string, isFolder = false) => {
    if (isFolder) {
      setCurrentPath([...currentPath, itemName]);
      setSelectedFile(null);
      setFileContent('');
    } else {
      setSelectedFile(currentPath.length > 0 ? `${currentPath.join('/')}/${itemName}` : itemName);
      // In a real app, you would fetch the file content from the API
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
    let current: any = SAMPLE_FILES;
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
    if (!selectedFile) return;

    setIsExecuting(true);
    
    // Simulate execution - in a real app, this would call an API
    setTimeout(() => {
      setExecutionOutput(`Running ${selectedFile}...
      
[INFO] Cloning repository ${repository.name}...
[INFO] Checkout branch ${repository.defaultBranch}...
[INFO] Setting up environment...
[INFO] Installing dependencies...
[INFO] Running script...

Processing input file: sample_data.txt
Successfully processed file and saved to: output.txt

[INFO] Execution completed successfully.
      `);
      setIsExecuting(false);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button variant="outline" onClick={onBack} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>
        <h1 className="text-2xl font-bold">{repository.name}</h1>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getProviderIcon()}
              <div>
                <CardTitle>{repository.name}</CardTitle>
                <CardDescription>{repository.description}</CardDescription>
              </div>
            </div>
            <Badge variant={repository.isPrivate ? 'outline' : 'secondary'}>
              {repository.isPrivate ? t('private') : t('public')}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs defaultValue="files">
            <div className="border-b px-3">
              <TabsList className="!px-0">
                <TabsTrigger value="files" className="relative">
                  <FolderTree className="h-4 w-4 mr-2" />
                  {t('files')}
                </TabsTrigger>
                <TabsTrigger value="execute">
                  <Play className="h-4 w-4 mr-2" />
                  {t('execute')}
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" />
                  {t('settings')}
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Files Tab */}
            <TabsContent value="files" className="m-0">
              <div className="grid grid-cols-5 h-[calc(100vh-20rem)]">
                {/* File Explorer */}
                <div className="col-span-1 border-r p-3">
                  <div className="flex items-center mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNavigateUp}
                      disabled={currentPath.length === 0}
                    >
                      {t('goUp')}
                    </Button>
                    <span className="ml-2 text-sm text-muted-foreground">
                      /{currentPath.join('/')}
                    </span>
                  </div>
                  <ScrollArea className="h-[calc(100vh-24rem)]">
                    <div className="space-y-1">
                      {Object.entries(getCurrentDirectory()).map(([name, item]) => (
                        <div
                          key={name}
                          onClick={() => handleNavigate(item, name, (item as any).type === 'folder')}
                          className="flex items-center p-2 rounded-md cursor-pointer hover:bg-muted transition-colors"
                        >
                          {(item as any).type === 'folder' ? (
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
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleExecuteScript}
                          disabled={isExecuting}
                        >
                          {isExecuting ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              {t('executing')}
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              {t('execute')}
                            </>
                          )}
                        </Button>
                      </div>
                      <ScrollArea className="h-[calc(100vh-28rem)] w-full rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                        <pre className="text-sm font-mono">
                          <code>{fileContent}</code>
                        </pre>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Code className="h-16 w-16 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">
                          {t('selectFileToView')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* Execute Tab */}
            <TabsContent value="execute" className="m-0 p-3">
              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('executionOutput')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {executionOutput ? (
                      <ScrollArea className="h-[calc(100vh-32rem)] w-full rounded-md border">
                        <pre className="p-4 text-sm font-mono">
                          {executionOutput}
                        </pre>
                      </ScrollArea>
                    ) : (
                      <Alert>
                        <AlertDescription>
                          {t('noExecutionOutput')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Settings Tab */}
            <TabsContent value="settings" className="m-0 p-3">
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    {t('repositorySettingsInfo')}
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}