'use server';

import { getHostWithDecryptedCredentials } from '@/app/actions/hostsAction';
import {
  SSHConnectionOptions,
  createConnection,
  closeConnection,
  executeOnConnection,
} from '@/lib/services/sshService';

// Key names for ADB remote control
const ADB_KEYS = {
  UP: 'KEYCODE_DPAD_UP',
  DOWN: 'KEYCODE_DPAD_DOWN',
  LEFT: 'KEYCODE_DPAD_LEFT',
  RIGHT: 'KEYCODE_DPAD_RIGHT',
  SELECT: 'KEYCODE_DPAD_CENTER',
  BACK: 'KEYCODE_BACK',
  HOME: 'KEYCODE_HOME',
  MENU: 'KEYCODE_MENU',
  VOLUME_UP: 'KEYCODE_VOLUME_UP',
  VOLUME_DOWN: 'KEYCODE_VOLUME_DOWN',
  VOLUME_MUTE: 'KEYCODE_VOLUME_MUTE',
  POWER: 'KEYCODE_POWER',
  // Phone specific keys
  CAMERA: 'KEYCODE_CAMERA',
  CALL: 'KEYCODE_CALL',
  ENDCALL: 'KEYCODE_ENDCALL',
  // TV/Media specific keys
  MEDIA_PLAY_PAUSE: 'KEYCODE_MEDIA_PLAY_PAUSE',
  MEDIA_PLAY: 'KEYCODE_MEDIA_PLAY',
  MEDIA_PAUSE: 'KEYCODE_MEDIA_PAUSE',
  MEDIA_STOP: 'KEYCODE_MEDIA_STOP',
  MEDIA_REWIND: 'KEYCODE_MEDIA_REWIND',
  MEDIA_FAST_FORWARD: 'KEYCODE_MEDIA_FAST_FORWARD',
  MEDIA_NEXT: 'KEYCODE_MEDIA_NEXT',
  MEDIA_PREVIOUS: 'KEYCODE_MEDIA_PREVIOUS',
} as const;

// Type for keys
export type AdbKeyType = keyof typeof ADB_KEYS;

// Interface for app information
export interface AndroidApp {
  packageName: string;
  label: string;
}

// Interface for UI element
export interface AndroidElement {
  id: number;
  tag: string;
  text: string;
  resourceId: string;
  contentDesc: string;
  className: string;
  bounds: string;
}

// Interface for dump result
export interface DumpResult {
  success: boolean;
  elements: AndroidElement[];
  totalCount: number;
  error?: string;
}

/**
 * Connect to SSH and ADB device
 */
export async function connectToHost(hostId: string, androidDeviceId: string) {
  try {
    // Get host with decrypted credentials
    const hostResult = await getHostWithDecryptedCredentials(hostId);
    if (!hostResult.success || !hostResult.data) {
      return { success: false, error: hostResult.error || 'Failed to get host credentials' };
    }

    const host = hostResult.data;
    if (!host.user) {
      return { success: false, error: 'Host is missing username for SSH connection' };
    }

    // Create SSH connection options
    const sshOptions: SSHConnectionOptions = {
      host: host.ip,
      port: host.port || 22,
      username: host.user,
      ...(host.auth_type === 'password' && host.password ? { password: host.password } : {}),
      ...(host.auth_type === 'privateKey' && (host as any).privateKey
        ? { privateKey: (host as any).privateKey }
        : {}),
      timeout: 10000,
    };

    // Create a persistent SSH connection
    console.log(`[@action:adbActions:connectToHost] Creating SSH connection to ${host.ip}`);
    const connectionResult = await createConnection(hostId, sshOptions);
    if (!connectionResult.success) {
      return {
        success: false,
        error: connectionResult.error || 'Failed to establish SSH connection',
      };
    }

    // Connect to ADB device
    const adbCommand = `adb connect ${androidDeviceId}`;
    console.log(`[@action:adbActions:connectToHost] Running command: ${adbCommand}`);

    const result = await executeOnConnection(hostId, adbCommand);
    if (!result.success) {
      // Close the connection if ADB connection fails
      await closeConnection(hostId);
      return { success: false, error: result.error || 'Failed to connect to ADB device' };
    }

    console.log(`[@action:adbActions:connectToHost] ADB connect command executed`);

    // Verify the device is actually connected by checking adb devices
    const devicesCommand = `adb devices`;
    console.log(`[@action:adbActions:connectToHost] Verifying connection with: ${devicesCommand}`);

    const devicesResult = await executeOnConnection(hostId, devicesCommand);
    if (!devicesResult.success) {
      await closeConnection(hostId);
      return { success: false, error: devicesResult.error || 'Failed to verify device connection' };
    }

    // Check if our device appears in the devices list
    const devicesOutput = devicesResult.data?.stdout || '';
    console.log(`[@action:adbActions:connectToHost] ADB devices output: ${devicesOutput}`);

    const deviceLines = devicesOutput
      .split('\n')
      .filter((line) => line.trim() && !line.includes('List of devices'));
    const deviceFound = deviceLines.find((line) => line.includes(androidDeviceId));

    if (!deviceFound) {
      await closeConnection(hostId);
      return {
        success: false,
        error: `Device ${androidDeviceId} not found in adb devices list`,
      };
    }

    if (deviceFound.includes('offline')) {
      await closeConnection(hostId);
      return {
        success: false,
        error: `Device ${androidDeviceId} is offline. Please check device connection and enable USB debugging.`,
      };
    }

    if (!deviceFound.includes('device')) {
      await closeConnection(hostId);
      return {
        success: false,
        error: `Device ${androidDeviceId} status: ${deviceFound.split('\t')[1] || 'unknown'}`,
      };
    }

    console.log(
      `[@action:adbActions:connectToHost] Successfully connected to device ${androidDeviceId} - verified in adb devices`,
    );
    return { success: true };
  } catch (error: any) {
    console.error(`[@action:adbActions:connectToHost] ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Disconnect from host
 */
export async function disconnectFromHost(hostId: string) {
  try {
    console.log(
      `[@action:adbActions:disconnectFromHost] Closing SSH connection for host ${hostId}`,
    );
    const result = await closeConnection(hostId);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    console.error(`[@action:adbActions:disconnectFromHost] ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Execute an ADB key command via SSH
 */
export async function executeAdbKeyCommand(
  hostId: string,
  androidDeviceId: string,
  key: AdbKeyType,
) {
  try {
    // Get the KeyEvent code
    const keyCode = ADB_KEYS[key];
    if (!keyCode) {
      return { success: false, error: `Invalid key: ${key}` };
    }

    // Execute the key command on the existing SSH connection
    const keyCommand = `adb -s ${androidDeviceId} shell input keyevent ${keyCode}`;
    console.log(`[@action:adbActions:executeAdbKeyCommand] Running command: ${keyCommand}`);

    const result = await executeOnConnection(hostId, keyCommand);
    if (!result.success) {
      console.error(
        `[@action:adbActions:executeAdbKeyCommand] Failed to execute command: ${result.error}`,
      );
      return { success: false, error: result.error || 'Failed to send key command' };
    }

    console.log(`[@action:adbActions:executeAdbKeyCommand] Successfully sent keyevent ${keyCode}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[@action:adbActions:executeAdbKeyCommand] ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get list of installed apps on Android device
 */
export async function getInstalledApps(
  hostId: string,
  androidDeviceId: string,
): Promise<{ success: boolean; apps?: AndroidApp[]; error?: string }> {
  try {
    console.log(`[@action:adbActions:getInstalledApps] Getting apps for device ${androidDeviceId}`);

    // Get list of installed packages
    const packagesCommand = `adb -s ${androidDeviceId} shell pm list packages -3`;
    const packagesResult = await executeOnConnection(hostId, packagesCommand);

    if (!packagesResult.success || !packagesResult.data?.stdout) {
      return { success: false, error: 'Failed to get packages list' };
    }

    const packages = packagesResult.data.stdout
      .split('\n')
      .filter((line: string) => line.startsWith('package:'))
      .map((line: string) => line.replace('package:', '').trim());

    const apps: AndroidApp[] = [];

    // Get app labels for each package (limit to first 20 for performance)
    for (const packageName of packages.slice(0, 20)) {
      try {
        const labelCommand = `adb -s ${androidDeviceId} shell dumpsys package ${packageName} | grep -A1 "applicationLabel"`;
        const labelResult = await executeOnConnection(hostId, labelCommand);

        let label = packageName; // Default to package name
        if (labelResult.success && labelResult.data?.stdout) {
          const match = labelResult.data.stdout.match(/applicationLabel=(.+)/);
          if (match && match[1]) {
            label = match[1].trim();
          }
        }

        apps.push({ packageName, label });
      } catch (err) {
        // If we can't get the label, use package name
        apps.push({ packageName, label: packageName });
      }
    }

    console.log(`[@action:adbActions:getInstalledApps] Found ${apps.length} apps`);
    return { success: true, apps };
  } catch (error: any) {
    console.error(`[@action:adbActions:getInstalledApps] ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Launch an app by package name
 */
export async function launchApp(
  hostId: string,
  androidDeviceId: string,
  packageName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `[@action:adbActions:launchApp] Launching app ${packageName} on device ${androidDeviceId}`,
    );

    const launchCommand = `adb -s ${androidDeviceId} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`;
    const result = await executeOnConnection(hostId, launchCommand);

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to launch app' };
    }

    console.log(`[@action:adbActions:launchApp] Successfully launched ${packageName}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[@action:adbActions:launchApp] ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Dump UI elements similar to appiumUtils.py print_visible_elements
 */
export async function dumpUIElements(hostId: string, androidDeviceId: string): Promise<DumpResult> {
  try {
    console.log(
      `[@action:adbActions:dumpUIElements] Dumping UI elements for device ${androidDeviceId}`,
    );

    // First, try to dump the UI hierarchy to a file
    const dumpToFileCommand = `adb -s ${androidDeviceId} shell uiautomator dump --compressed /sdcard/ui_dump.xml`;
    console.log(`[@action:adbActions:dumpUIElements] Running dump command: ${dumpToFileCommand}`);

    const dumpResult = await executeOnConnection(hostId, dumpToFileCommand);
    if (!dumpResult.success) {
      console.error(`[@action:adbActions:dumpUIElements] Dump to file failed: ${dumpResult.error}`);
      return {
        success: false,
        elements: [],
        totalCount: 0,
        error: `Failed to dump UI: ${dumpResult.error}`,
      };
    }

    console.log(`[@action:adbActions:dumpUIElements] Dump successful, reading file...`);

    // Then read the dumped file
    const readFileCommand = `adb -s ${androidDeviceId} shell cat /sdcard/ui_dump.xml`;
    console.log(`[@action:adbActions:dumpUIElements] Reading file with: ${readFileCommand}`);

    const result = await executeOnConnection(hostId, readFileCommand);
    if (!result.success) {
      console.error(`[@action:adbActions:dumpUIElements] Read file failed: ${result.error}`);
      return {
        success: false,
        elements: [],
        totalCount: 0,
        error: `Failed to read UI dump: ${result.error}`,
      };
    }

    if (!result.data?.stdout || result.data.stdout.trim().length === 0) {
      console.error(
        `[@action:adbActions:dumpUIElements] No XML data received. stdout length: ${result.data?.stdout?.length || 0}`,
      );
      return {
        success: false,
        elements: [],
        totalCount: 0,
        error: 'No UI data received from device',
      };
    }

    console.log(
      `[@action:adbActions:dumpUIElements] Received XML data, length: ${result.data.stdout.length}`,
    );

    // Parse XML to extract elements (improved parsing)
    const elements: AndroidElement[] = [];
    const xmlData = result.data.stdout;

    // Log the first 1000 characters of XML for debugging
    console.log(`[@action:adbActions:dumpUIElements] XML Preview (first 1000 chars):`);
    console.log(xmlData.substring(0, 1000));
    console.log(`[@action:adbActions:dumpUIElements] XML Preview end...`);

    // Check if we have valid XML
    if (!xmlData.includes('<node') || !xmlData.includes('</hierarchy>')) {
      console.error(`[@action:adbActions:dumpUIElements] Invalid XML format received`);
      console.log(`[@action:adbActions:dumpUIElements] Full XML content:`);
      console.log(xmlData);
      return {
        success: false,
        elements: [],
        totalCount: 0,
        error: 'Invalid XML format received from device',
      };
    }

    // Try different regex patterns to find nodes
    console.log(`[@action:adbActions:dumpUIElements] Testing different regex patterns...`);

    // Pattern 1: Self-closing nodes
    const selfClosingRegex = /<node[^>]*\/>/gs;
    const selfClosingMatches = xmlData.match(selfClosingRegex) || [];
    console.log(
      `[@action:adbActions:dumpUIElements] Self-closing nodes found: ${selfClosingMatches.length}`,
    );

    // Pattern 2: Open/close nodes
    const openCloseRegex = /<node[^>]*>.*?<\/node>/gs;
    const openCloseMatches = xmlData.match(openCloseRegex) || [];
    console.log(
      `[@action:adbActions:dumpUIElements] Open/close nodes found: ${openCloseMatches.length}`,
    );

    // Pattern 3: All nodes (both patterns combined)
    const allNodesRegex = /<node[^>]*(?:\/>|>.*?<\/node>)/gs;
    const allMatches = xmlData.match(allNodesRegex) || [];
    console.log(`[@action:adbActions:dumpUIElements] All nodes found: ${allMatches.length}`);

    // Use the pattern that finds the most nodes
    let matches = allMatches;
    if (selfClosingMatches.length > allMatches.length) {
      matches = selfClosingMatches;
      console.log(
        `[@action:adbActions:dumpUIElements] Using self-closing pattern (found more matches)`,
      );
    }

    console.log(
      `[@action:adbActions:dumpUIElements] Selected ${matches.length} total node elements for processing`,
    );

    // Log first few matches for debugging
    console.log(`[@action:adbActions:dumpUIElements] First 3 node matches:`);
    for (let i = 0; i < Math.min(3, matches.length); i++) {
      console.log(
        `[@action:adbActions:dumpUIElements] Node ${i + 1}: ${matches[i].substring(0, 200)}...`,
      );
    }

    let elementCounter = 0;
    let filteredOutCount = 0;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      try {
        // Extract attributes using improved regex
        const getAttr = (attr: string): string => {
          const attrRegex = new RegExp(`${attr}="([^"]*)"`, 'i');
          const attrMatch = match.match(attrRegex);
          return attrMatch ? attrMatch[1] : '';
        };

        const text = getAttr('text').trim();
        const resourceId = getAttr('resource-id');
        const contentDesc = getAttr('content-desc');
        const className = getAttr('class');
        const bounds = getAttr('bounds');
        const clickable = getAttr('clickable') === 'true';
        const enabled = getAttr('enabled') === 'true';
        const displayed = getAttr('displayed') !== 'false'; // Most elements don't have this attr, so default to true

        // Log details of first 10 elements for debugging
        if (i < 10) {
          console.log(`[@action:adbActions:dumpUIElements] Element ${i + 1} details:`);
          console.log(`  - Class: "${className}"`);
          console.log(`  - Text: "${text}"`);
          console.log(`  - Resource-ID: "${resourceId}"`);
          console.log(`  - Content-Desc: "${contentDesc}"`);
          console.log(`  - Clickable: ${clickable}`);
          console.log(`  - Enabled: ${enabled}`);
          console.log(`  - Bounds: "${bounds}"`);
        }

        // Apply filtering logic similar to appiumUtils.py
        let shouldFilter = false;
        let filterReason = '';

        // Skip elements with None/null/empty tag AND no text AND no resource-id AND no content-desc
        if (
          (!className || className.toLowerCase() === 'none' || className === '') &&
          (!text || text === '') &&
          (!resourceId || resourceId === 'null' || resourceId === '') &&
          (!contentDesc || contentDesc === '')
        ) {
          shouldFilter = true;
          filterReason =
            'No useful identifiers (class, text, resource-id, content-desc all empty/null)';
        }

        // Skip elements with null as resource-id (additional check from Python)
        if (resourceId === 'null') {
          shouldFilter = true;
          filterReason = 'Resource-ID is null';
        }

        // Skip elements that are not clickable, not enabled, and have no text (not useful for interaction)
        if (!clickable && !enabled && (!text || text === '')) {
          shouldFilter = true;
          filterReason = 'Not interactive (not clickable, not enabled, no text)';
        }

        if (shouldFilter) {
          filteredOutCount++;
          if (i < 10) {
            console.log(`[@action:adbActions:dumpUIElements]   -> FILTERED OUT: ${filterReason}`);
          }
          continue;
        }

        elementCounter++;
        const element = {
          id: elementCounter,
          tag: className || 'unknown',
          text: text || '<no text>',
          resourceId: resourceId || '<no resource-id>',
          contentDesc: contentDesc || '<no content-desc>',
          className: className || '',
          bounds: bounds || '',
        };

        elements.push(element);

        if (i < 10) {
          console.log(
            `[@action:adbActions:dumpUIElements]   -> KEPT: Element ID ${elementCounter}`,
          );
        }
      } catch (err) {
        console.warn(`[@action:adbActions:dumpUIElements] Error parsing element ${i + 1}: ${err}`);
        filteredOutCount++;
      }
    }

    console.log(`[@action:adbActions:dumpUIElements] Processing complete:`);
    console.log(`[@action:adbActions:dumpUIElements] - Total nodes found: ${matches.length}`);
    console.log(`[@action:adbActions:dumpUIElements] - Useful elements: ${elements.length}`);
    console.log(`[@action:adbActions:dumpUIElements] - Filtered out: ${filteredOutCount}`);

    // Log all kept elements for debugging
    console.log(`[@action:adbActions:dumpUIElements] Final kept elements:`);
    elements.forEach((el, index) => {
      console.log(
        `[@action:adbActions:dumpUIElements] ${index + 1}. ID=${el.id} | Class=${el.tag} | Text="${el.text}" | ResourceID="${el.resourceId}"`,
      );
    });

    return { success: true, elements, totalCount: elements.length };
  } catch (error: any) {
    console.error(`[@action:adbActions:dumpUIElements] ERROR: ${error.message}`);
    return { success: false, elements: [], totalCount: 0, error: error.message };
  }
}

/**
 * Click on an element by resource ID, text, or content description
 */
export async function clickElement(
  hostId: string,
  androidDeviceId: string,
  element: AndroidElement,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `[@action:adbActions:clickElement] Attempting to click element ID=${element.id}: Resource-ID=${element.resourceId}, Text=${element.text}, Content-Desc=${element.contentDesc}`,
    );

    // Parse bounds to get coordinates if available
    let coordinates: { x: number; y: number } | null = null;
    if (element.bounds && element.bounds !== '') {
      // Bounds format: [x1,y1][x2,y2]
      const boundsMatch = element.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (boundsMatch) {
        const [, x1, y1, x2, y2] = boundsMatch.map(Number);
        coordinates = {
          x: Math.round((x1 + x2) / 2),
          y: Math.round((y1 + y2) / 2),
        };
        console.log(
          `[@action:adbActions:clickElement] Calculated tap coordinates: ${coordinates.x}, ${coordinates.y}`,
        );
      }
    }

    // If we have coordinates from bounds, use direct tap
    if (coordinates) {
      const tapCommand = `adb -s ${androidDeviceId} shell input tap ${coordinates.x} ${coordinates.y}`;
      console.log(`[@action:adbActions:clickElement] Using direct tap: ${tapCommand}`);

      const result = await executeOnConnection(hostId, tapCommand);
      if (result.success) {
        console.log(
          `[@action:adbActions:clickElement] Successfully clicked element using coordinates`,
        );
        return { success: true };
      } else {
        console.warn(`[@action:adbActions:clickElement] Direct tap failed: ${result.error}`);
        // Fall through to try other methods
      }
    }

    // Fallback 1: Try clicking by resource ID
    if (
      element.resourceId &&
      element.resourceId !== '<no resource-id>' &&
      element.resourceId !== 'null'
    ) {
      console.log(
        `[@action:adbActions:clickElement] Trying resource ID method: ${element.resourceId}`,
      );

      // Use a simpler approach to find and click by resource ID
      const resourceIdCommand = `adb -s ${androidDeviceId} shell "uiautomator dump /dev/stdout | grep -o 'resource-id=\"${element.resourceId}\"[^>]*bounds=\"\\[[0-9,]*\\]\\[[0-9,]*\\]\"' | head -1 | grep -o 'bounds=\"\\[[0-9,]*\\]\\[[0-9,]*\\]\"' | sed 's/bounds=\"\\[\\([0-9]*\\),\\([0-9]*\\)\\]\\[\\([0-9]*\\),\\([0-9]*\\)\\]\"/\\1 \\2 \\3 \\4/' | awk '{print (\$1+\$3)/2, (\$2+\$4)/2}'"`;

      const coordResult = await executeOnConnection(hostId, resourceIdCommand);
      if (coordResult.success && coordResult.data?.stdout?.trim()) {
        const coords = coordResult.data.stdout.trim().split(' ');
        if (coords.length === 2) {
          const tapCommand = `adb -s ${androidDeviceId} shell input tap ${coords[0]} ${coords[1]}`;
          console.log(
            `[@action:adbActions:clickElement] Tapping at resource ID coordinates: ${coords[0]}, ${coords[1]}`,
          );

          const tapResult = await executeOnConnection(hostId, tapCommand);
          if (tapResult.success) {
            console.log(
              `[@action:adbActions:clickElement] Successfully clicked element using resource ID`,
            );
            return { success: true };
          }
        }
      }
    }

    // Fallback 2: Try clicking by text content
    if (element.text && element.text !== '<no text>' && element.text !== '') {
      console.log(`[@action:adbActions:clickElement] Trying text method: ${element.text}`);

      // Escape special characters for grep
      const escapedText = element.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const textCommand = `adb -s ${androidDeviceId} shell "uiautomator dump /dev/stdout | grep -o 'text=\"${escapedText}\"[^>]*bounds=\"\\[[0-9,]*\\]\\[[0-9,]*\\]\"' | head -1 | grep -o 'bounds=\"\\[[0-9,]*\\]\\[[0-9,]*\\]\"' | sed 's/bounds=\"\\[\\([0-9]*\\),\\([0-9]*\\)\\]\\[\\([0-9]*\\),\\([0-9]*\\)\\]\"/\\1 \\2 \\3 \\4/' | awk '{print (\$1+\$3)/2, (\$2+\$4)/2}'"`;

      const coordResult = await executeOnConnection(hostId, textCommand);
      if (coordResult.success && coordResult.data?.stdout?.trim()) {
        const coords = coordResult.data.stdout.trim().split(' ');
        if (coords.length === 2) {
          const tapCommand = `adb -s ${androidDeviceId} shell input tap ${coords[0]} ${coords[1]}`;
          console.log(
            `[@action:adbActions:clickElement] Tapping at text coordinates: ${coords[0]}, ${coords[1]}`,
          );

          const tapResult = await executeOnConnection(hostId, tapCommand);
          if (tapResult.success) {
            console.log(
              `[@action:adbActions:clickElement] Successfully clicked element using text`,
            );
            return { success: true };
          }
        }
      }
    }

    // Fallback 3: Try clicking by content description
    if (
      element.contentDesc &&
      element.contentDesc !== '<no content-desc>' &&
      element.contentDesc !== ''
    ) {
      console.log(
        `[@action:adbActions:clickElement] Trying content description method: ${element.contentDesc}`,
      );

      // Escape special characters for grep
      const escapedDesc = element.contentDesc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const descCommand = `adb -s ${androidDeviceId} shell "uiautomator dump /dev/stdout | grep -o 'content-desc=\"${escapedDesc}\"[^>]*bounds=\"\\[[0-9,]*\\]\\[[0-9,]*\\]\"' | head -1 | grep -o 'bounds=\"\\[[0-9,]*\\]\\[[0-9,]*\\]\"' | sed 's/bounds=\"\\[\\([0-9]*\\),\\([0-9]*\\)\\]\\[\\([0-9]*\\),\\([0-9]*\\)\\]\"/\\1 \\2 \\3 \\4/' | awk '{print (\$1+\$3)/2, (\$2+\$4)/2}'"`;

      const coordResult = await executeOnConnection(hostId, descCommand);
      if (coordResult.success && coordResult.data?.stdout?.trim()) {
        const coords = coordResult.data.stdout.trim().split(' ');
        if (coords.length === 2) {
          const tapCommand = `adb -s ${androidDeviceId} shell input tap ${coords[0]} ${coords[1]}`;
          console.log(
            `[@action:adbActions:clickElement] Tapping at content-desc coordinates: ${coords[0]}, ${coords[1]}`,
          );

          const tapResult = await executeOnConnection(hostId, tapCommand);
          if (tapResult.success) {
            console.log(
              `[@action:adbActions:clickElement] Successfully clicked element using content description`,
            );
            return { success: true };
          }
        }
      }
    }

    // If all methods failed
    console.error(`[@action:adbActions:clickElement] All click methods failed for element`);
    return {
      success: false,
      error: 'Unable to click element - no viable coordinates or identifiers found',
    };
  } catch (error: any) {
    console.error(`[@action:adbActions:clickElement] ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}
