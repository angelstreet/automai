/**
 * Bash Desktop Terminal Configuration
 *
 * Configuration for bash desktop terminal controller panel layout and behavior
 */

export const bashDesktopConfig = {
  panel_layout: {
    collapsed: {
      width: '350px',
      height: '400px',
      position: {
        bottom: '20px',
        right: '20px',
      },
    },
    expanded: {
      width: '500px',
      height: '600px',
      position: {
        bottom: '20px',
        right: '20px',
      },
    },
    header: {
      height: '48px',
      padding: '8px',
      backgroundColor: '#1E1E1E',
      textColor: '#ffffff',
      borderColor: '#333',
      fontSize: '0.875rem',
      fontWeight: 'bold',
      iconSize: 'small' as const,
    },
    zIndex: 1300,
  },
  terminal: {
    backgroundColor: '#1e1e1e',
    textColor: '#00ff00',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    maxHeight: '300px',
    scrollBehavior: 'smooth' as const,
  },
  desktop_info: {
    name: 'Bash Desktop Terminal',
    description: 'Execute bash commands on the host machine',
    capabilities: [
      'command_execution',
      'file_operations',
      'directory_navigation',
      'script_execution',
      'system_info',
    ],
  },
};

export const BASH_DESKTOP_HEADER_HEIGHT = '48px';
