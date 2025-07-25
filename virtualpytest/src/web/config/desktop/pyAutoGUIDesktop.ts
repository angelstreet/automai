/**
 * PyAutoGUI Desktop Configuration
 *
 * Configuration for PyAutoGUI desktop automation controller panel layout and behavior
 */

export const pyAutoGUIDesktopConfig = {
  panel_layout: {
    collapsed: {
      width: '400px',
      height: '500px',
      position: {
        bottom: '20px',
        right: '20px',
      },
    },
    expanded: {
      width: '550px',
      height: '700px',
      position: {
        bottom: '20px',
        right: '20px',
      },
    },
    header: {
      height: '48px',
      padding: '8px',
      backgroundColor: '#1a1a2e',
      textColor: '#0ff',
      borderColor: '#333',
      fontSize: '0.875rem',
      fontWeight: 'bold',
      iconSize: 'small' as const,
    },
    zIndex: 1300,
  },
  terminal: {
    backgroundColor: '#1a1a2e',
    textColor: '#0ff',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    minHeight: '120px',
    scrollBehavior: 'smooth' as const,
  },
  desktop_info: {
    name: 'PyAutoGUI Desktop',
    description: 'Cross-platform GUI automation using PyAutoGUI',
    capabilities: [
      'application_launch',
      'mouse_control',
      'keyboard_input',
      'screenshot_capture',
      'image_recognition',
    ],
  },
  quick_commands: {
    apps: ['notepad', 'mspaint', 'calc', 'explorer'],
    keys: ['ctrl+c', 'ctrl+v', 'ctrl+s', 'alt+f4', 'enter', 'escape'],
  },
};

export const PYAUTOGUI_DESKTOP_HEADER_HEIGHT = '48px';
