import CodeEditorClient from './client/CodeEditorClient';

/**
 * Server component for code page
 * Displays VS Code-like editor with Git integration
 */
export default async function CodeContent() {
  return <CodeEditorClient />;
}
