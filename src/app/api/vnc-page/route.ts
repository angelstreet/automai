import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const host = searchParams.get('host') || '';
  const port = searchParams.get('port') || '5900';
  const password = searchParams.get('password') || '';
  const viewOnly = searchParams.get('viewOnly') === 'true';

  // Log connection details (safely)
  console.log('[@api:vnc-page] VNC connection request:', {
    host,
    port,
    has_password: !!password,
    password_preview: password ? `${password.charAt(0)}...` : 'none',
    viewOnly,
  });

  // Create a standalone HTML page with noVNC and debugging
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VNC Viewer</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    #vnc-container { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
    #debug-overlay { 
      position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); 
      color: white; font-size: 11px; padding: 5px; z-index: 1000; max-width: 300px;
      max-height: 150px; overflow: auto; font-family: monospace;
      pointer-events: none;
    }
  </style>
  <!-- Import full noVNC bundle that works in browser -->
  <script src="https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/lib/rfb.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/vendor/pako/lib/pako.js"></script>
</head>
<body>
  <div id="vnc-container"></div>
  <div id="debug-overlay"></div>
  <script>
    // Debug logging helper
    function debugLog(msg) {
      const now = new Date().toISOString().slice(11, 19);
      console.log('[VNC-IFRAME] ' + msg);
      const debugEl = document.getElementById('debug-overlay');
      debugEl.innerHTML += \`[\${now}] \${msg}<br>\`;
      debugEl.scrollTop = debugEl.scrollHeight;
    }

    // Configure VNC connection
    const connectionParams = {
      host: "${host}",
      port: ${port},
      password: "${password.charAt(0)}...", // Only show first char for security
      viewOnly: ${viewOnly}
    };

    debugLog('Starting connection with params: ' + JSON.stringify(connectionParams));
    debugLog('ViewOnly mode: ' + (${viewOnly} ? 'ENABLED' : 'DISABLED'));

    // Initialize VNC viewer
    window.onload = function() {
      try {
        debugLog('Window loaded, checking for RFB...');
        
        // Check if RFB is loaded
        if (typeof RFB === 'undefined') {
          debugLog('ERROR: RFB not found! noVNC library not loaded');
          debugLog('Available globals: ' + Object.keys(window).filter(k => k.includes('vnc') || k === 'RFB').join(', '));
          window.parent.postMessage('error', '*');
          return;
        }

        debugLog('RFB found, creating instance...');
        
        // Override the VNC container with a set size to help scaling
        const container = document.getElementById('vnc-container');
        
        // Create RFB instance with viewOnly explicitly set
        const rfb = new RFB(container, {
          encrypt: false,
          credentials: { password: "${password}" },
          viewOnly: true, // ALWAYS view only for safety
          shared: true,
          qualityLevel: 6,
          compressionLevel: 2
        });
        
        // Force view-only mode regardless of URL parameter - essential for security
        rfb._viewOnly = true;

        debugLog('RFB created, connecting to ' + connectionParams.host + ':' + connectionParams.port);
        rfb.connect(connectionParams.host, connectionParams.port);

        rfb.addEventListener('connect', () => {
          debugLog('Connected successfully! (View-only: ' + rfb._viewOnly + ')');
          window.parent.postMessage('connected', '*');
        });

        rfb.addEventListener('disconnect', (e) => {
          const reason = e.detail ? (e.detail.clean ? 'clean' : 'error') : 'unknown';
          debugLog('Disconnected: ' + reason);
          window.parent.postMessage('disconnected', '*');
        });

        rfb.addEventListener('credentialsrequired', () => {
          debugLog('Auth failed - credentials required');
          window.parent.postMessage('auth-failed', '*');
        });

        rfb.addEventListener('securityfailure', (e) => {
          const reason = e.detail && e.detail.reason ? e.detail.reason : 'unknown';
          debugLog('Security failure: ' + reason);
          window.parent.postMessage('disconnected', '*');
        });
        
        // Add keyboard and mouse event handlers to enforce view-only
        document.addEventListener('keydown', (e) => {
          if (${viewOnly}) {
            e.preventDefault();
            debugLog('Blocked keyboard input (view-only mode)');
            return false;
          }
        }, true);
        
        container.addEventListener('mousedown', (e) => {
          if (${viewOnly}) {
            e.preventDefault();
            debugLog('Blocked mouse input (view-only mode)');
            return false;
          }
        }, true);
        
        // Periodically check view-only status
        setInterval(() => {
          if (rfb && !rfb._viewOnly) {
            debugLog('Enforcing view-only mode');
            rfb._viewOnly = true;
          }
        }, 1000);

      } catch (err) {
        debugLog('EXCEPTION: ' + err.message);
        window.parent.postMessage('error', '*');
      }
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
