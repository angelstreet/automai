'use client';

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';

interface FileInfo {
  name: string;
  path: string;
  content: string;
  language: string;
}

interface FileExplorerProps {
  files: FileInfo[];
  onFileSelect: (file: FileInfo) => void;
  selectedFilePath?: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  file?: FileInfo;
}

export default function FileExplorer({ files, onFileSelect, selectedFilePath }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));

  // Build tree structure from flat file list
  const fileTree = useMemo(() => {
    if (!files.length) return null;

    const root: TreeNode = {
      name: 'Root',
      path: '/',
      type: 'folder',
      children: [],
    };

    files.forEach((file) => {
      const pathParts = file.path.split('/').filter(Boolean);
      let currentNode = root;

      pathParts.forEach((part, index) => {
        const currentPath = '/' + pathParts.slice(0, index + 1).join('/');
        const isFile = index === pathParts.length - 1;

        if (!currentNode.children) {
          currentNode.children = [];
        }

        let existingNode = currentNode.children.find((child) => child.name === part);

        if (!existingNode) {
          existingNode = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : [],
            file: isFile ? file : undefined,
          };
          currentNode.children.push(existingNode);
        }

        currentNode = existingNode;
      });
    });

    // Sort children: folders first, then files, both alphabetically
    const sortChildren = (node: TreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortChildren);
      }
    };

    sortChildren(root);
    return root;
  }, [files]);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = (file: FileInfo) => {
    console.log('[@component:FileExplorer] File selected:', file.path);
    onFileSelect(file);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    // Language-specific icons using emoji
    const iconMap: Record<string, string> = {
      js: '🟨',
      jsx: '⚛️',
      ts: '🔷',
      tsx: '⚛️',
      py: '🐍',
      rb: '💎',
      go: '🐹',
      rs: '🦀',
      java: '☕',
      php: '🐘',
      cpp: '⚙️',
      c: '⚙️',
      cs: '🔵',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      sass: '🎨',
      less: '🎨',
      json: '📋',
      xml: '📄',
      md: '📝',
      mdx: '📝',
      yml: '⚙️',
      yaml: '⚙️',
      sh: '💻',
      bash: '💻',
      sql: '🗃️',
      dockerfile: '🐳',
    };

    return iconMap[extension || ''] || '📄';
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFilePath === node.path;

    if (node.type === 'file' && node.file) {
      return (
        <div
          key={node.path}
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-muted/50 transition-colors ${
            isSelected ? 'bg-accent' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFileClick(node.file!)}
        >
          <File size={14} className="text-muted-foreground flex-shrink-0" />
          <span className="text-xs mr-1">{getFileIcon(node.name)}</span>
          <span className="text-sm truncate" title={node.name}>
            {node.name}
          </span>
        </div>
      );
    }

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <div
            className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-muted/50 transition-colors"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
            )}
            <Folder size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="text-xs mr-1">📁</span>
            <span className="text-sm truncate font-medium" title={node.name}>
              {node.name}
            </span>
          </div>
          {isExpanded && node.children && (
            <div>{node.children.map((child) => renderTreeNode(child, depth + 1))}</div>
          )}
        </div>
      );
    }

    return null;
  };

  if (!fileTree || !files.length) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Folder className="mx-auto mb-2" size={32} />
        <p className="text-sm">No files to display</p>
        <p className="text-xs">Clone a repository to explore files</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <div className="p-2">
        <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
          EXPLORER ({files.length} files)
        </div>
        {fileTree.children?.map((child) => renderTreeNode(child, 0))}
      </div>
    </div>
  );
}
