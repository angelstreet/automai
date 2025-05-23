'use client';

import React, { useRef, useEffect, useState } from 'react';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  language: string;
  content?: string; // Optional, loaded on demand
}

interface MonacoEditorClientProps {
  file: FileInfo;
}

export default function MonacoEditorClient({ file }: MonacoEditorClientProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoInstanceRef = useRef<any>(null);
  const [isDisposed, setIsDisposed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // If file has no content, show loading state
  if (!file.content) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground text-sm">Loading {file.name}...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!editorRef.current || !file.content) return;

    let isMounted = true;

    const initializeEditor = async () => {
      try {
        console.log('[@component:MonacoEditorClient] Loading Monaco editor...');

        // Dynamic import to prevent SSR issues
        const monaco = await import('monaco-editor');

        if (!isMounted || !editorRef.current || !file.content) return;

        console.log('[@component:MonacoEditorClient] Initializing Monaco editor');

        // Determine if file is too large for minimap
        const isLargeFile = file.content.length > 50000; // 50KB threshold
        const lineCount = file.content.split('\n').length;
        const isVeryLargeFile = lineCount > 1000 || file.content.length > 100000;

        // Create Monaco editor instance with performance optimizations
        const editor = monaco.editor.create(editorRef.current, {
          value: isVeryLargeFile
            ? file.content.substring(0, 50000) +
              '\n\n// ... File truncated for performance (showing first 50KB)'
            : file.content,
          language: file.language,
          theme: 'vs-dark',
          automaticLayout: true,
          fontSize: 13,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: true,
          minimap: {
            enabled: !isLargeFile, // Disable minimap for large files
          },
          wordWrap: 'on',
          folding: !isVeryLargeFile, // Disable folding for very large files
          glyphMargin: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 17,
            horizontalScrollbarSize: 17,
          },
          // Performance optimizations for large files
          links: !isVeryLargeFile,
          occurrencesHighlight: !isVeryLargeFile,
          renderLineHighlight: isVeryLargeFile ? 'none' : 'line',
          selectionHighlight: !isVeryLargeFile,
        });

        if (isMounted) {
          monacoInstanceRef.current = editor;
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[@component:MonacoEditorClient] Failed to initialize Monaco:', error);
        setIsLoading(false);
      }
    };

    initializeEditor();

    // Cleanup function
    return () => {
      isMounted = false;
      console.log('[@component:MonacoEditorClient] Disposing Monaco editor');
      setIsDisposed(true);

      if (monacoInstanceRef.current) {
        try {
          if (typeof monacoInstanceRef.current.dispose === 'function') {
            monacoInstanceRef.current.dispose();
          }
        } catch (error) {
          console.warn('[@component:MonacoEditorClient] Editor disposal warning:', error);
        }
        monacoInstanceRef.current = null;
      }
    };
  }, [file.content, file.language]); // Re-run when content or language changes

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground text-sm">Loading Monaco Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={editorRef} className="h-full w-full" />
    </div>
  );
} 