'use client';

import { useEffect, useRef, useState } from 'react';

interface MonacoEditorProps {
  content?: string;
  language?: string;
  theme?: 'vs-dark' | 'vs-light';
  onChange?: (value: string) => void;
  height?: number;
}

export function MonacoEditor({
  content = '// Welcome to the Code Editor\n// Clone a Git repository to get started',
  language = 'javascript',
  theme = 'vs-dark',
  onChange,
  height,
}: MonacoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let editorInstance: any;

    const initMonaco = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const monaco = await import('monaco-editor');

        // Configure Monaco for web workers
        self.MonacoEnvironment = {
          getWorkerUrl: function (_moduleId, label) {
            if (label === 'json') {
              return './monaco-editor/esm/vs/language/json/json.worker.js';
            }
            if (label === 'css' || label === 'scss' || label === 'less') {
              return './monaco-editor/esm/vs/language/css/css.worker.js';
            }
            if (label === 'html' || label === 'handlebars' || label === 'razor') {
              return './monaco-editor/esm/vs/language/html/html.worker.js';
            }
            if (label === 'typescript' || label === 'javascript') {
              return './monaco-editor/esm/vs/language/typescript/ts.worker.js';
            }
            return './monaco-editor/esm/vs/editor/editor.worker.js';
          },
        };

        if (editorRef.current) {
          editorInstance = monaco.editor.create(editorRef.current, {
            value: content,
            language: language,
            theme: theme,
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            wordWrap: 'on',
            lineNumbers: 'on',
            folding: true,
            bracketMatching: 'always',
            autoIndent: 'full',
            formatOnPaste: true,
            formatOnType: true,
            scrollBeyondLastLine: false,
          });

          // Handle content changes
          editorInstance.onDidChangeModelContent(() => {
            const value = editorInstance.getValue();
            onChange?.(value);
          });

          setEditor(editorInstance);
        }
      } catch (error) {
        console.error('[@component:MonacoEditor] Failed to initialize Monaco:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initMonaco();

    return () => {
      if (editorInstance) {
        editorInstance.dispose();
      }
    };
  }, []);

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getValue()) {
      editor.setValue(content);
    }
  }, [editor, content]);

  // Update language when prop changes
  useEffect(() => {
    if (editor) {
      const model = editor.getModel();
      if (model) {
        // Dynamic import for language setting
        import('monaco-editor').then((monaco) => {
          monaco.editor.setModelLanguage(model, language);
        });
      }
    }
  }, [editor, language]);

  // Update theme when prop changes
  useEffect(() => {
    if (editor) {
      import('monaco-editor').then((monaco) => {
        monaco.editor.setTheme(theme);
      });
    }
  }, [editor, theme]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-900"
        style={height ? { height: `${height}px` } : { height: '100%' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-400">Loading Monaco Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={editorRef}
      className="w-full"
      style={height ? { height: `${height}px` } : { height: '100%' }}
    />
  );
}
