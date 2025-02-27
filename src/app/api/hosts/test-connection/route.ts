import { NextResponse } from 'next/server';
import { Client } from 'ssh2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { type, ip, port, username, machineId } = data;

    // Get host from database to get password
    const hostRecord = await prisma.host.findUnique({
      where: { id: machineId },
    });

    if (!hostRecord) {
      return NextResponse.json({ success: false, message: 'Host not found' }, { status: 404 });
    }

    // Test SSH connection
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

      conn.on('ready', () => {
        clearTimeout(timeout);
        if (!resolved) {
          conn.end();
          resolved = true;
          resolve(NextResponse.json({ success: true }));
        }
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve(NextResponse.json({ success: false, message: err.message }, { status: 500 }));
        }
      });

      // Attempt connection
      conn.connect({
        host: ip,
        port: port || 22,
        username: username,
        password: hostRecord.password,
      });
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
