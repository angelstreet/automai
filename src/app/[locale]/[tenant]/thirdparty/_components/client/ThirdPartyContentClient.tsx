'use client';

import { ExternalLink, Edit3, Trash2, Globe, Search, Check, X } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';

import {
  THIRDPARTY_CONFIG,
  ERROR_MESSAGES,
  TOOL_CATEGORIES,
  PREDEFINED_TOOLS,
} from '../../constants';

/**
 * Client component for managing third party tools
 */
export { ThirdPartyContentClient as default, ThirdPartyContentClient };

interface ThirdPartyTool {
  id: string;
  name: string;
  description?: string;
  url: string;
  icon: string; // Now path to icon image
  category: string;
  isActive: boolean;
  sortOrder: number;
}

function ThirdPartyContentClient() {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [tools, setTools] = useState<ThirdPartyTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTool, setEditingTool] = useState<ThirdPartyTool | null>(null);
  const [showToolSelector, setShowToolSelector] = useState(false);

  // Tool selection state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

  // Listen for OPEN_TOOL_SELECTOR event from ThirdPartyActionsClient
  useEffect(() => {
    const handleOpenToolSelector = () => {
      setShowToolSelector(true);
    };

    window.addEventListener('OPEN_TOOL_SELECTOR', handleOpenToolSelector);

    return () => {
      window.removeEventListener('OPEN_TOOL_SELECTOR', handleOpenToolSelector);
    };
  }, []);

  // Mock existing user tools - will be replaced with API calls
  useEffect(() => {
    // Simulate loading from API
    setTimeout(() => {
      setTools([
        {
          id: '1',
          name: 'JIRA Kanban',
          description: 'Kanban board for agile project management',
          url: 'https://automaiv2.atlassian.net/jira/software/projects/KAN/boards/1',
          icon: '/icons/tools/jira.svg',
          category: 'Task',
          isActive: true,
          sortOrder: 0,
        },
        {
          id: '2',
          name: 'GitHub',
          description: 'Code repository and collaboration platform',
          url: 'https://github.com',
          icon: '/icons/tools/github.svg',
          category: 'Software',
          isActive: true,
          sortOrder: 1,
        },
        {
          id: '3',
          name: 'Slack',
          description: 'Team communication and collaboration',
          url: 'https://slack.com',
          icon: '/icons/tools/slack.svg',
          category: 'Issues',
          isActive: true,
          sortOrder: 2,
        },
        {
          id: '4',
          name: 'Trello',
          description: 'Visual project management with boards and cards',
          url: 'https://trello.com',
          icon: '/icons/tools/trello.svg',
          category: 'Task',
          isActive: true,
          sortOrder: 3,
        },
        {
          id: '5',
          name: 'Notion',
          description: 'All-in-one workspace for notes, docs, and projects',
          url: 'https://notion.so',
          icon: '/icons/tools/notion.svg',
          category: 'Documentation',
          isActive: true,
          sortOrder: 4,
        },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  // Sort tools alphabetically by name
  const sortedTools = [...tools].sort((a, b) => a.name.localeCompare(b.name));

  const filteredTools = sortedTools.filter(
    (tool) => activeCategory === 'All' || tool.category === activeCategory,
  );

  const getCategoryCount = (category: string) => {
    if (category === 'All') return tools.length;
    return tools.filter((tool) => tool.category === category).length;
  };

  // Filter predefined tools based on search and category
  const filteredPredefinedTools = PREDEFINED_TOOLS.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;

    // Don't show tools that are already added
    const alreadyAdded = tools.some(
      (existingTool) => existingTool.name === tool.name || existingTool.url === tool.defaultUrl,
    );

    return matchesSearch && matchesCategory && !alreadyAdded;
  });

  const openTool = (tool: ThirdPartyTool) => {
    try {
      const popup = window.open(
        tool.url,
        `${tool.name.toLowerCase()}-tool`,
        `width=${THIRDPARTY_CONFIG.POPUP_WIDTH},height=${THIRDPARTY_CONFIG.POPUP_HEIGHT},scrollbars=yes,resizable=yes,toolbar=no,menubar=no`,
      );

      if (popup) {
        popup.focus();
        console.log(`[@component:ThirdPartyContentClient] Opened ${tool.name} in popup:`, tool.url);
      } else {
        setError(ERROR_MESSAGES.POPUP_BLOCKED);
      }
    } catch (err) {
      console.error(`[@component:ThirdPartyContentClient] Failed to open ${tool.name}:`, err);
      setError(ERROR_MESSAGES.TOOL_LOAD_ERROR);
    }
  };

  const handleEditTool = (tool: ThirdPartyTool) => {
    setEditingTool(tool);
    setShowAddForm(true);
  };

  const handleDeleteTool = (toolId: string) => {
    if (confirm('Are you sure you want to delete this tool?')) {
      setTools((prev) => prev.filter((tool) => tool.id !== toolId));
      console.log(`[@component:ThirdPartyContentClient] Deleted tool:`, toolId);
    }
  };

  const handleToolSelection = (toolId: string) => {
    setSelectedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  const addSelectedTools = () => {
    const toolsToAdd = PREDEFINED_TOOLS.filter((tool) => selectedTools.has(tool.id)).map(
      (tool, index) => ({
        id: `${Date.now()}-${index}`,
        name: tool.name,
        description: tool.description,
        url: tool.defaultUrl,
        icon: tool.icon,
        category: tool.category,
        isActive: true,
        sortOrder: tools.length + index,
      }),
    );

    setTools((prev) => [...prev, ...toolsToAdd]);
    setSelectedTools(new Set());
    setShowToolSelector(false);
    setSearchTerm('');
    setSelectedCategory('All');

    console.log(`[@component:ThirdPartyContentClient] Added ${toolsToAdd.length} tools`);
  };

  const handleCloseToolSelector = () => {
    setShowToolSelector(false);
    setSelectedTools(new Set());
    setSearchTerm('');
    setSelectedCategory('All');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading tools...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {TOOL_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeCategory === category
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              {category} ({getCategoryCount(category)})
            </button>
          ))}
        </nav>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            className="group relative border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer bg-card overflow-hidden"
            onClick={() => openTool(tool)}
          >
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />

            {/* Tool Icon & Name */}
            <div className="relative flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <Image
                    src={tool.icon}
                    alt={`${tool.name} icon`}
                    width={20}
                    height={20}
                    className="object-contain"
                    onError={(e) => {
                      // Fallback to external link icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <ExternalLink className="h-5 w-5 text-muted-foreground hidden" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{tool.name}</h3>
                  <span className="text-xs text-muted-foreground">{tool.category}</span>
                </div>
              </div>

              {/* Action Buttons - Show on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 relative z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTool(tool);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Edit3 className="h-3 w-3 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTool(tool.id);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            </div>

            {/* Description */}
            {tool.description && (
              <div className="relative">
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {tool.description}
                </p>
              </div>
            )}

            {/* Hover indicator */}
            <div className="relative flex items-center justify-end">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-3 w-3 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No tools found</h3>
          <p className="text-muted-foreground mb-4">
            {activeCategory === 'All'
              ? "You haven't added any tools yet."
              : `No tools in the ${activeCategory} category.`}
          </p>
          <button
            onClick={() => setShowToolSelector(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Add Your First Tool
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-destructive underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tool Selector Modal */}
      {showToolSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Add Tools</h3>
                <button
                  onClick={handleCloseToolSelector}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search tools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {TOOL_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tools List */}
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="space-y-3">
                {filteredPredefinedTools.map((tool) => {
                  const isSelected = selectedTools.has(tool.id);

                  return (
                    <div
                      key={tool.id}
                      className={`flex items-center gap-4 p-3 border rounded-md cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent'
                      }`}
                      onClick={() => handleToolSelection(tool.id)}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary' : 'border-input'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>

                      {/* Icon */}
                      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <Image
                          src={tool.icon}
                          alt={`${tool.name} icon`}
                          width={16}
                          height={16}
                          className="object-contain"
                          onError={(e) => {
                            // Fallback to external link icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <ExternalLink className="h-4 w-4 text-muted-foreground hidden" />
                      </div>

                      {/* Tool Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{tool.name}</h4>
                          {tool.isPopular && (
                            <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded">
                              Popular
                            </span>
                          )}
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded">
                            {tool.category}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                      </div>
                    </div>
                  );
                })}

                {filteredPredefinedTools.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No tools found matching your criteria</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedTools.size} tool{selectedTools.size !== 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCloseToolSelector}
                  className="px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addSelectedTools}
                  disabled={selectedTools.size === 0}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add {selectedTools.size > 0 ? `${selectedTools.size} ` : ''}Tool
                  {selectedTools.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal - Placeholder for now */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">
              {editingTool ? 'Edit Tool' : 'Add Custom Tool'}
            </h3>
            <p className="text-muted-foreground mb-4">
              Custom tool form will be implemented next...
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingTool(null);
                }}
                className="px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
