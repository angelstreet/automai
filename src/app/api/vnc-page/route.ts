import { NextResponse } from 'next/server';

export async function POST(request) {
  const { host, port = '5900', password = '', viewOnly = true } = await request.json();

  console.log('[@api:vnc-page] VNC request:', { host, port, has_password: !!password, viewOnly });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VNC Viewer</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    #vnc-container { width: 100%; height: 100%; }
    #loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
    #loading .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/dist/vnc.min.js"></script>
</head>
<body>
  <div id="vnc-container"></div>
  <div id="loading"><div class="spinner"></div><div>Loading...</div></div>
  <script>
    function debugLog(msg) {
      console.log('[VNC] ' + msg);
      window.parent.postMessage({ type: 'debug', message: msg }, '*');
    }

    debugLog('Connecting to VNC server');
    const rfb = new RFB(document.getElementById('vnc-container'), {
      encrypt: false,
      credentials: { password: "${password}" },
      viewOnly: ${viewOnly},
      shared: true,
      qualityLevel: 3,
      compressionLevel: 4
    });

    const wsUrl = 'ws://localhost:6080/vnc?vnc_host=${encodeURIComponent(host)}&vnc_port=${port}';
    rfb.connect(wsUrl, { wsProtocols: ['binary'] });

    rfb.addEventListener('connect', () => {
      debugLog('Connected');
      document.getElementById('loading').style.display = 'none';
      window.parent.postMessage('connected', '*');
    });

    rfb.addEventListener('disconnect', (e) => {
      debugLog('Disconnected: ' + (e.detail?.reason || 'unknown'));
      window.parent.postMessage('disconnected', '*');
    });

    rfb.addEventListener('credentialsrequired', () => {
      debugLog('Authentication failed');
      window.parent.postMessage('auth-failed', '*');
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
