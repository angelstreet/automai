import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const host = searchParams.get('host') || '';
  const port = searchParams.get('port') || '5900';
  const password = searchParams.get('password') || '';
  const viewOnly = searchParams.get('viewOnly') === 'true';

  // Create a standalone HTML page with noVNC
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VNC Viewer</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    #vnc-container { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
  </style>
  <!-- Import noVNC libraries directly -->
  <script src="https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/lib/rfb.min.js"></script>
</head>
<body>
  <div id="vnc-container"></div>
  <script>
    // Configure VNC connection
    const connectionParams = {
      host: "${host}",
      port: ${port},
      password: "${password}",
      viewOnly: ${viewOnly}
    };

    // Initialize VNC viewer
    window.onload = function() {
      const rfb = new RFB(document.getElementById('vnc-container'), {
        encrypt: false,
        credentials: { password: connectionParams.password },
        viewOnly: connectionParams.viewOnly,
        shared: true
      });

      // Connect to VNC server
      rfb.connect(connectionParams.host, connectionParams.port);

      // Handle messages from parent frame
      window.addEventListener('message', (event) => {
        if (event.data === 'disconnect') {
          rfb.disconnect();
        }
      });

      // Report connection status to parent
      rfb.addEventListener('connect', () => {
        window.parent.postMessage('connected', '*');
      });

      rfb.addEventListener('disconnect', () => {
        window.parent.postMessage('disconnected', '*');
      });

      rfb.addEventListener('credentialsrequired', () => {
        window.parent.postMessage('auth-failed', '*');
      });
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
