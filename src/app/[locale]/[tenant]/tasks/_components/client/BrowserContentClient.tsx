'use client';

import { useState, useEffect } from 'react';
import { MONDAY_CONFIG, ERROR_MESSAGES } from '../../constants';

/**
 * Client component for displaying and managing Monday.com tasks
 */
export { TasksContentClient as default, TasksContentClient };

interface MondayBoardConfig {
  boardUrl: string;
  boardId?: string;
  viewType?: 'main_table' | 'kanban' | 'calendar';
}

function TasksContentClient() {
  const [mondayConfig, setMondayConfig] = useState<MondayBoardConfig>({
    boardUrl: '',
    viewType: 'kanban',
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if there's a saved configuration
  useEffect(() => {
    const savedConfig = localStorage.getItem('monday-board-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setMondayConfig(config);
        setIsConfigured(true);
      } catch (err) {
        console.error('[@component:TasksContentClient] Failed to load saved config:', err);
      }
    }
  }, []);

  const handleConfigSave = () => {
    if (!mondayConfig.boardUrl) {
      setError('Please enter a Monday.com board URL');
      return;
    }

    // Validate URL format
    if (!mondayConfig.boardUrl.includes('monday.com')) {
      setError(ERROR_MESSAGES.INVALID_BOARD_URL);
      return;
    }

    try {
      // Save configuration
      localStorage.setItem('monday-board-config', JSON.stringify(mondayConfig));
      setIsConfigured(true);
      setError(null);
      console.log('[@component:TasksContentClient] Configuration saved successfully');
    } catch (err) {
      setError(ERROR_MESSAGES.UNEXPECTED_ERROR);
      console.error('[@component:TasksContentClient] Failed to save config:', err);
    }
  };

  const handleReconfigure = () => {
    setIsConfigured(false);
    setError(null);
  };

  if (!isConfigured) {
    return (
      <div className="space-y-6 p-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">Configure Monday.com Integration</h2>
          <p className="text-muted-foreground mb-6">
            Connect your Monday.com board to start managing tasks. You'll need a public or shareable
            board URL.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="boardUrl" className="block text-sm font-medium mb-2">
                Monday.com Board URL
              </label>
              <input
                id="boardUrl"
                type="url"
                value={mondayConfig.boardUrl}
                onChange={(e) => setMondayConfig((prev) => ({ ...prev, boardUrl: e.target.value }))}
                placeholder="https://your-company.monday.com/boards/123456789"
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste the URL of your Monday.com board here
              </p>
            </div>

            <div>
              <label htmlFor="viewType" className="block text-sm font-medium mb-2">
                Default View
              </label>
              <select
                id="viewType"
                value={mondayConfig.viewType}
                onChange={(e) =>
                  setMondayConfig((prev) => ({
                    ...prev,
                    viewType: e.target.value as MondayBoardConfig['viewType'],
                  }))
                }
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="kanban">Kanban View</option>
                <option value="main_table">Table View</option>
                <option value="calendar">Calendar View</option>
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
            <h3 className="font-medium mb-2">How to get your Monday.com board URL:</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open your Monday.com board</li>
              <li>Click the "Share" button in the top-right</li>
              <li>Enable "Share board" or "Make public"</li>
              <li>Copy the shareable URL</li>
              <li>Paste it above</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Monday.com Task Board</h2>
        <button
          onClick={handleReconfigure}
          className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground border border-input rounded-md hover:bg-accent transition-colors"
        >
          Reconfigure
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <iframe
          src={mondayConfig.boardUrl}
          width={MONDAY_CONFIG.IFRAME_WIDTH}
          height={MONDAY_CONFIG.IFRAME_HEIGHT}
          frameBorder="0"
          title="Monday.com Task Board"
          className="w-full"
          onError={() => setError(ERROR_MESSAGES.MONDAY_LOAD_ERROR)}
        />
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
