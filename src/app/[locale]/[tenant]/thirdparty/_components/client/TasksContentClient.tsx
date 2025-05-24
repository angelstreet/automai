'use client';

import { ExternalLink, Eye, Calendar, List } from 'lucide-react';
import { useState, useEffect } from 'react';

import { ERROR_MESSAGES } from '../../constants';

/**
 * Client component for displaying and managing JIRA tasks
 */
export { TasksContentClient as default, TasksContentClient };

interface JiraBoardConfig {
  boardUrl: string;
  projectKey?: string;
  viewType?: 'kanban' | 'scrum' | 'list';
}

function TasksContentClient() {
  const [jiraConfig, setJiraConfig] = useState<JiraBoardConfig>({
    boardUrl: '',
    viewType: 'kanban',
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if there's a saved configuration
  useEffect(() => {
    const savedConfig = localStorage.getItem('jira-board-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setJiraConfig(config);
        setIsConfigured(true);
      } catch (err) {
        console.error('[@component:TasksContentClient] Failed to load saved config:', err);
      }
    }
  }, []);

  const handleConfigSave = () => {
    if (!jiraConfig.boardUrl) {
      setError('Please enter a JIRA board URL');
      return;
    }

    // Validate URL format for JIRA
    if (!jiraConfig.boardUrl.includes('atlassian.net')) {
      setError('Please enter a valid JIRA URL (should contain atlassian.net)');
      return;
    }

    try {
      // Save configuration
      localStorage.setItem('jira-board-config', JSON.stringify(jiraConfig));
      setIsConfigured(true);
      setError(null);
      console.log('[@component:TasksContentClient] JIRA configuration saved successfully');
    } catch (err) {
      setError(ERROR_MESSAGES.UNEXPECTED_ERROR);
      console.error('[@component:TasksContentClient] Failed to save config:', err);
    }
  };

  const handleReconfigure = () => {
    setIsConfigured(false);
    setError(null);
  };

  const openJiraBoard = (viewType?: string) => {
    let url = jiraConfig.boardUrl;

    // Add view type parameter if specified
    if (viewType && viewType !== jiraConfig.viewType) {
      // Modify URL for different views if needed
      // For now, we'll just open the base URL
    }

    const popup = window.open(
      url,
      'jira-board',
      'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no',
    );

    if (popup) {
      popup.focus();
      console.log('[@component:TasksContentClient] Opened JIRA board in popup:', url);
    } else {
      setError('Popup blocked. Please allow popups for this site and try again.');
    }
  };

  const openJiraInNewTab = () => {
    window.open(jiraConfig.boardUrl, '_blank');
    console.log(
      '[@component:TasksContentClient] Opened JIRA board in new tab:',
      jiraConfig.boardUrl,
    );
  };

  if (!isConfigured) {
    return (
      <div className="space-y-6 p-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">Configure JIRA Integration</h2>
          <p className="text-muted-foreground mb-6">
            Connect your JIRA board to start managing tasks. You'll need a public or shareable board
            URL from your JIRA instance.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="boardUrl" className="block text-sm font-medium mb-2">
                JIRA Board URL
              </label>
              <input
                id="boardUrl"
                type="url"
                value={jiraConfig.boardUrl}
                onChange={(e) => setJiraConfig((prev) => ({ ...prev, boardUrl: e.target.value }))}
                placeholder="https://automaiv2.atlassian.net/jira/software/projects/KAN/boards/1"
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste the URL of your JIRA board here
              </p>
            </div>

            <div>
              <label htmlFor="viewType" className="block text-sm font-medium mb-2">
                Default View
              </label>
              <select
                id="viewType"
                value={jiraConfig.viewType}
                onChange={(e) =>
                  setJiraConfig((prev) => ({
                    ...prev,
                    viewType: e.target.value as JiraBoardConfig['viewType'],
                  }))
                }
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="kanban">Kanban View</option>
                <option value="scrum">Scrum Board</option>
                <option value="list">List View</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button
              onClick={handleConfigSave}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Save Configuration
            </button>
          </div>

          <div className="mt-8 p-4 bg-muted rounded-md">
            <h3 className="font-medium mb-2">How to get your JIRA board URL:</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open your JIRA project in a browser</li>
              <li>Navigate to your Kanban or Scrum board</li>
              <li>Copy the URL from the address bar</li>
              <li>Make sure the board is accessible (may need to enable public access)</li>
              <li>Paste the URL above</li>
            </ol>
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
              <strong>Note:</strong> The board will open in a popup window or new tab when accessed.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">JIRA Task Board</h2>
        <button
          onClick={handleReconfigure}
          className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground border border-input rounded-md hover:bg-accent transition-colors"
        >
          Reconfigure
        </button>
      </div>

      {/* Board Info Card */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-lg mb-2">Connected JIRA Board</h3>
            <p className="text-sm text-muted-foreground break-all">{jiraConfig.boardUrl}</p>
          </div>

          {/* Quick Access Buttons */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Quick Access:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => openJiraBoard()}
                className="flex items-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <Eye className="h-4 w-4" />
                Open Board (Popup)
              </button>

              <button
                onClick={openJiraInNewTab}
                className="flex items-center gap-2 px-4 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </button>
            </div>
          </div>

          {/* View Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">View Options:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <button
                onClick={() => openJiraBoard('kanban')}
                className="flex items-center gap-2 px-3 py-2 border border-input rounded-md hover:bg-accent transition-colors text-sm"
              >
                <Eye className="h-3 w-3" />
                Kanban
              </button>

              <button
                onClick={() => openJiraBoard('scrum')}
                className="flex items-center gap-2 px-3 py-2 border border-input rounded-md hover:bg-accent transition-colors text-sm"
              >
                <Calendar className="h-3 w-3" />
                Scrum
              </button>

              <button
                onClick={() => openJiraBoard('list')}
                className="flex items-center gap-2 px-3 py-2 border border-input rounded-md hover:bg-accent transition-colors text-sm"
              >
                <List className="h-3 w-3" />
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-md p-4">
        <h4 className="font-medium text-sm mb-2">📋 Task Management Tips:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Use the popup window for focused task management</li>
          <li>• Open in new tab if you prefer multiple browser tabs</li>
          <li>• Popup windows can be resized and moved around your screen</li>
          <li>• If popups are blocked, check your browser's popup settings</li>
        </ul>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
