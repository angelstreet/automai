import { NextResponse } from 'next/server';
import { Client } from 'ssh2';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { host, port = 22 } = data;

    if (!host) {
      return NextResponse.json({ success: false, message: 'Host is required' }, { status: 400 });
    }

    // Get SSH fingerprint
    return new Promise((resolve) => {
      const conn = new Client();
      let resolved = false;

      // Set a timeout for the connection attempt
      const timeout = setTimeout(() => {
        if (!resolved) {
          conn.end();
          resolved = true;
          resolve(
            NextResponse.json({ success: false, message: 'Connection timed out' }, { status: 408 }),
          );
        }
      }, 5000);

      conn.on('handshake', (handshake) => {
        clearTimeout(timeout);
        if (!resolved) {
          conn.end();
          resolved = true;
          resolve(
            NextResponse.json({
              success: true,
              fingerprint: handshake.hashAlgo + ' ' + handshake.fingerprint,
            }),
          );
        }
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve(NextResponse.json({ success: false, message: err.message }, { status: 500 }));
        }
      });

      // Attempt connection to get fingerprint
      conn.connect({
        host,
        port,
        username: 'dummy', // Not used for fingerprint verification
        password: 'dummy', // Not used for fingerprint verification
        readyTimeout: 5000,
        hostVerifier: () => true, // Accept any host key
      });
    });
  } catch (error) {
    console.error('Error verifying fingerprint:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
