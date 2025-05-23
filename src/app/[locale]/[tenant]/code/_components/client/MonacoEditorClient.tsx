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
  const [isInitializing, setIsInitializing] = useState(false);

  console.log('[@component:MonacoEditorClient] Rendering with file:', file.name);
  console.log('[@component:MonacoEditorClient] File content exists?', !!file.content);
  console.log('[@component:MonacoEditorClient] File content length:', file.content?.length || 0);

  useEffect(() => {
    console.log('[@component:MonacoEditorClient] useEffect triggered - Component mounted');
    console.log('[@component:MonacoEditorClient] editorRef.current exists?', !!editorRef.current);

    // Capture the ref value for cleanup
    const currentEditor = editorRef.current;

    // Only initialize if we have content
    if (!file.content) {
      console.log('[@component:MonacoEditorClient] No content available, skipping initialization');
      return;
    }

    const initializeEditor = async () => {
      if (!editorRef.current) {
        console.error(
          '[@component:MonacoEditorClient] DOM element not ready on initialization attempt',
        );
        return;
      }

      // Prevent multiple initializations
      if (monacoInstanceRef.current) {
        console.log('[@component:MonacoEditorClient] Editor already initialized, skipping');
        return;
      }

      try {
        console.log('[@component:MonacoEditorClient] Starting Monaco editor initialization...');
        setIsInitializing(true);

        // Clean up any existing Monaco context on the DOM element
        const container = editorRef.current;

        // Remove any Monaco-specific attributes
        container.removeAttribute('data-monaco-editor-initialized');
        container.removeAttribute('data-keybinding-context');

        // Clear any existing content and classes that Monaco might have added
        container.innerHTML = '';
        container.className = '';

        // Reset inline styles to ensure clean state
        container.style.cssText = 'width: 100%; height: 100%;';

        console.log('[@component:MonacoEditorClient] DOM element cleaned for initialization');

        // Configure Monaco Environment for Next.js
        if (typeof window !== 'undefined') {
          (window as any).MonacoEnvironment = {
            getWorker: function (_workerId: string, label: string) {
              const getWorkerModule = (moduleUrl: string, label: string) => {
                return new Worker(moduleUrl, {
                  name: label,
                  type: 'module',
                });
              };

              switch (label) {
                case 'json':
                  return getWorkerModule(
                    '/monaco-editor/min/vs/language/json/json.worker.js',
                    label,
                  );
                case 'css':
                case 'scss':
                case 'less':
                  return getWorkerModule('/monaco-editor/min/vs/language/css/css.worker.js', label);
                case 'html':
                case 'handlebars':
                case 'razor':
                  return getWorkerModule(
                    '/monaco-editor/min/vs/language/html/html.worker.js',
                    label,
                  );
                case 'typescript':
                case 'javascript':
                  return getWorkerModule(
                    '/monaco-editor/min/vs/language/typescript/ts.worker.js',
                    label,
                  );
                default:
                  return getWorkerModule('/monaco-editor/min/vs/editor/editor.worker.js', label);
              }
            },
          };
        }

        // Set a timeout to prevent infinite loading
        const timeout = setTimeout(() => {
          console.error(
            '[@component:MonacoEditorClient] Timeout: Monaco editor initialization took too long',
          );
          setIsInitializing(false);
        }, 10000); // 10 seconds timeout

        // Dynamic import to prevent SSR issues
        const monaco = await import('monaco-editor');
        console.log('[@component:MonacoEditorClient] Monaco imported successfully');

        if (!editorRef.current || !file.content) {
          console.log(
            '[@component:MonacoEditorClient] Element or content lost during Monaco import',
          );
          clearTimeout(timeout);
          setIsInitializing(false);
          return;
        }

        // Double check the element is still clean
        if (monacoInstanceRef.current) {
          console.log(
            '[@component:MonacoEditorClient] Editor was created during async operation, skipping',
          );
          clearTimeout(timeout);
          setIsInitializing(false);
          return;
        }

        console.log('[@component:MonacoEditorClient] Initializing Monaco editor');
        console.log('[@component:MonacoEditorClient] Editor container dimensions:', {
          width: editorRef.current.offsetWidth,
          height: editorRef.current.offsetHeight,
        });

        // Determine if file is too large for minimap
        const isLargeFile = file.content.length > 50000; // 50KB threshold
        const lineCount = file.content.split('\n').length;
        const isVeryLargeFile = lineCount > 1000 || file.content.length > 100000;

        console.log('[@component:MonacoEditorClient] File stats:', {
          contentLength: file.content.length,
          lineCount,
          isLargeFile,
          isVeryLargeFile,
          language: file.language,
        });

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
            enabled: false, // Disable minimap to prevent buffer allocation errors
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
          occurrencesHighlight: !isVeryLargeFile ? 'singleFile' : 'off',
          renderLineHighlight: isVeryLargeFile ? 'none' : 'line',
          selectionHighlight: !isVeryLargeFile,
        });

        console.log('[@component:MonacoEditorClient] Monaco editor created successfully');

        monacoInstanceRef.current = editor;
        setIsInitializing(false);
        clearTimeout(timeout);
        console.log('[@component:MonacoEditorClient] Editor initialization complete');
      } catch (error) {
        console.error('[@component:MonacoEditorClient] Failed to initialize Monaco:', error);
        setIsInitializing(false);
      }
    };

    initializeEditor();

    // Cleanup function
    return () => {
      console.log('[@component:MonacoEditorClient] useEffect cleanup - Component unmounting');
      console.log('[@component:MonacoEditorClient] Disposing Monaco editor');
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

      // Clean up DOM element thoroughly using captured ref
      if (currentEditor) {
        const container = currentEditor;
        container.removeAttribute('data-monaco-editor-initialized');
        container.removeAttribute('data-keybinding-context');
        container.innerHTML = '';
        container.className = '';
        container.style.cssText = 'width: 100%; height: 100%;';
      }
    };
  }, [file.content, file.language]); // Re-run when content or language changes

  // Always render the container div and overlay loading states
  return (
    <div className="relative h-full w-full">
      {/* Editor container - remove Tailwind classes to prevent Monaco conflicts */}
      <div ref={editorRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading overlay */}
      {(!file.content || isInitializing) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground text-sm">
              {!file.content ? `Loading ${file.name}...` : 'Initializing Monaco Editor...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
