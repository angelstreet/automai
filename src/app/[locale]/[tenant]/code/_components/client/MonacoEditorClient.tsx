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

        // Configure Monaco Environment for Next.js - completely disable workers
        if (typeof window !== 'undefined') {
          (window as any).MonacoEnvironment = {
            getWorker: function () {
              // Return a simple fake worker to prevent all worker-related errors
              return {
                postMessage: () => {},
                terminate: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                onerror: null,
                onmessage: null,
                onmessageerror: null,
              } as any;
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
          folding: false, // Disable folding to prevent worker-dependent features
          glyphMargin: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 17,
            horizontalScrollbarSize: 17,
            // Ensure smooth scrolling behavior
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            verticalSliderSize: 17,
            horizontalSliderSize: 17,
            arrowSize: 11,
          },
          // Enable smooth scrolling and mouse wheel support
          smoothScrolling: true,
          mouseWheelScrollSensitivity: 1,
          fastScrollSensitivity: 5,
          scrollPredominantAxis: true,
          // Ensure proper viewport handling
          revealHorizontalRightPadding: 30,
          scrollBeyondLastColumn: 10,
          // Improve scroll responsiveness
          cursorSmoothCaretAnimation: 'off',
          disableMonospaceOptimizations: false, // Enable optimizations
          renderLineHighlight: 'none',
          // Simplified configuration to avoid worker issues
          links: false,
          occurrencesHighlight: 'off',
          selectionHighlight: false,
          colorDecorators: false,
          hover: {
            enabled: false,
          },
          lightbulb: {
            enabled: 'off' as any, // Use 'off' instead of false
          },
          parameterHints: {
            enabled: false,
          },
          suggest: {
            showKeywords: false,
            showSnippets: false,
            showValues: false,
            showMethods: false,
            showFunctions: false,
            showConstructors: false,
            showFields: false,
            showVariables: false,
            showClasses: false,
            showStructs: false,
            showInterfaces: false,
            showModules: false,
            showProperties: false,
            showEvents: false,
            showOperators: false,
            showUnits: false,
            showColors: false,
            showFiles: false,
            showReferences: false,
            showFolders: false,
            showTypeParameters: false,
            showUsers: false,
            showIssues: false,
          },
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          acceptSuggestionOnCommitCharacter: false,
          acceptSuggestionOnEnter: 'off',
          wordBasedSuggestions: 'off' as any, // Use 'off' instead of false
          contextmenu: false,
          codeLens: false,
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

      // Dispose Monaco editor
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
      {/* Monaco Editor container - simplified since no parent scroll interference */}
      <div
        ref={editorRef}
        className="h-full w-full"
        style={{
          // Simple styling - let Monaco handle everything
          position: 'relative',
          overflow: 'hidden', // Monaco handles internal scrolling
        }}
      />

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
