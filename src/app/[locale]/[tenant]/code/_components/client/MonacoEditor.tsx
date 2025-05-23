'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';

interface FileInfo {
  name: string;
  path: string;
  content: string;
  language: string;
}

interface MonacoEditorProps {
  file: FileInfo;
}

export default function MonacoEditor({ file }: MonacoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isDisposed, setIsDisposed] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    console.log('[@component:MonacoEditor] Initializing Monaco editor');

    // Create Monaco editor instance
    const editor = monaco.editor.create(editorRef.current, {
      value: file.content,
      language: file.language,
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 13,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: true, // Make read-only for now
      minimap: {
        enabled: true,
      },
      wordWrap: 'on',
      folding: true,
      glyphMargin: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: 17,
        horizontalScrollbarSize: 17,
      },
    });

    monacoInstanceRef.current = editor;

    // Cleanup function
    return () => {
      console.log('[@component:MonacoEditor] Disposing Monaco editor');
      setIsDisposed(true);

      try {
        // Check if editor is still valid before disposing
        if (editor && !editor.isDisposed && !editor.isDisposed()) {
          editor.dispose();
        }
      } catch (error) {
        // Silently handle disposal errors - they're common with Monaco
        console.warn('[@component:MonacoEditor] Editor disposal warning (expected):', error);
      }

      monacoInstanceRef.current = null;
    };
  }, []);

  // Update content when file changes
  useEffect(() => {
    if (monacoInstanceRef.current && file && !isDisposed) {
      console.log('[@component:MonacoEditor] Updating file content:', file.path);

      try {
        const model = monacoInstanceRef.current.getModel();
        if (model && !monacoInstanceRef.current.isDisposed()) {
          model.setValue(file.content);
          monaco.editor.setModelLanguage(model, file.language);
        }
      } catch (error) {
        console.warn('[@component:MonacoEditor] Error updating content:', error);
      }
    }
  }, [file, isDisposed]);

  return (
    <div className="relative h-full w-full">
      <div ref={editorRef} className="h-full w-full" />
    </div>
  );
}
