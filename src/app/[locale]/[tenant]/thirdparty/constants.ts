// Debug settings
export const DEBUG = false;

// Third party tools configuration
export const THIRDPARTY_CONFIG = {
  // Default popup dimensions
  POPUP_WIDTH: 1200,
  POPUP_HEIGHT: 800,

  // Refresh intervals (in milliseconds)
  REFRESH_INTERVAL: 30 * 1000, // 30 seconds

  // Maximum tools per category
  MAX_TOOLS_PER_CATEGORY: 50,
};

// Cache TTL settings (in milliseconds)
export const CACHE_TTL = {
  TOOLS: 5 * 60 * 1000, // 5 minutes
};

// Request cooldown period to prevent excessive API calls
export const REQUEST_COOLDOWN = 1000; // 1 second

// Available categories for tools
export const TOOL_CATEGORIES = [
  'All',
  'Task',
  'Documentation',
  'Issues',
  'Software',
  'Learning',
] as const;

// Error messages
export const ERROR_MESSAGES = {
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  TOOL_LOAD_ERROR: 'Failed to load third party tool',
  INVALID_URL: 'Invalid URL provided',
  POPUP_BLOCKED: 'Popup blocked. Please allow popups for this site.',
  SAVE_FAILED: 'Failed to save tool configuration',
  DELETE_FAILED: 'Failed to delete tool',
};

// Predefined tools catalog that users can select from
export interface ToolTemplate {
  id: string;
  name: string;
  description: string;
  defaultUrl: string;
  urlPlaceholder: string;
  icon: string; // Now path to icon image
  category: (typeof TOOL_CATEGORIES)[number];
  tags: string[];
  isPopular?: boolean;
}

export const PREDEFINED_TOOLS: ToolTemplate[] = [
  // Task Management
  {
    id: 'jira-kanban',
    name: 'JIRA Kanban',
    description: 'Kanban board for agile project management',
    defaultUrl: 'https://your-domain.atlassian.net/jira/software/projects/YOUR_PROJECT/boards/1',
    urlPlaceholder: 'https://your-domain.atlassian.net/jira/software/projects/PROJECT/boards/1',
    icon: '/icons/tools/jira.svg',
    category: 'Task',
    tags: ['agile', 'kanban', 'atlassian', 'project-management'],
    isPopular: true,
  },
  {
    id: 'jira-tickets',
    name: 'JIRA Issues',
    description: 'Issue tracking and ticket management',
    defaultUrl: 'https://your-domain.atlassian.net/jira/software/projects/YOUR_PROJECT/issues',
    urlPlaceholder: 'https://your-domain.atlassian.net/jira/software/projects/PROJECT/issues',
    icon: '/icons/tools/jira.svg',
    category: 'Task',
    tags: ['issues', 'tickets', 'atlassian', 'bug-tracking'],
    isPopular: true,
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Visual project management with boards and cards',
    defaultUrl: 'https://trello.com',
    urlPlaceholder: 'https://trello.com/b/YOUR_BOARD_ID/board-name',
    icon: '/icons/tools/trello.svg',
    category: 'Task',
    tags: ['kanban', 'visual', 'simple', 'boards'],
    isPopular: true,
  },
  {
    id: 'monday',
    name: 'Monday.com',
    description: 'Work operating system for teams',
    defaultUrl: 'https://monday.com',
    urlPlaceholder: 'https://your-team.monday.com/boards/12345678',
    icon: '/icons/tools/monday.svg',
    category: 'Task',
    tags: ['work-os', 'project-management', 'collaboration'],
    isPopular: true,
  },

  // Documentation
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Team workspace and knowledge base',
    defaultUrl: 'https://your-domain.atlassian.net/wiki',
    urlPlaceholder: 'https://your-domain.atlassian.net/wiki/spaces/SPACE/overview',
    icon: '/icons/tools/confluence.svg',
    category: 'Documentation',
    tags: ['wiki', 'knowledge-base', 'atlassian', 'collaboration'],
    isPopular: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'All-in-one workspace for notes, docs, and projects',
    defaultUrl: 'https://notion.so',
    urlPlaceholder: 'https://your-workspace.notion.site/page-id',
    icon: '/icons/tools/notion.svg',
    category: 'Documentation',
    tags: ['workspace', 'notes', 'docs', 'database'],
    isPopular: true,
  },

  // Issues & Support
  {
    id: 'xray',
    name: 'Xray Test Management',
    description: 'Test management and QA tool for JIRA',
    defaultUrl: 'https://your-domain.atlassian.net/plugins/servlet/ac/com.xpandit.plugins.xray',
    urlPlaceholder: 'https://your-domain.atlassian.net/plugins/servlet/ac/com.xpandit.plugins.xray',
    icon: '/icons/tools/xray.svg',
    category: 'Issues',
    tags: ['testing', 'qa', 'xray', 'atlassian'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team communication and collaboration',
    defaultUrl: 'https://slack.com',
    urlPlaceholder: 'https://your-workspace.slack.com/channels/channel-name',
    icon: '/icons/tools/slack.svg',
    category: 'Issues',
    tags: ['communication', 'chat', 'collaboration'],
    isPopular: true,
  },

  // Software Development
  {
    id: 'github',
    name: 'GitHub',
    description: 'Code repository and collaboration platform',
    defaultUrl: 'https://github.com',
    urlPlaceholder: 'https://github.com/username/repository',
    icon: '/icons/tools/github.svg',
    category: 'Software',
    tags: ['git', 'code', 'repository', 'collaboration'],
    isPopular: true,
  },

  // Learning
  {
    id: 'coursera',
    name: 'Coursera',
    description: 'Online learning platform with courses from top universities',
    defaultUrl: 'https://coursera.org',
    urlPlaceholder: 'https://coursera.org/learn/course-name',
    icon: '/icons/tools/coursera.svg',
    category: 'Learning',
    tags: ['learning', 'courses', 'education', 'certification'],
    isPopular: true,
  },
];
