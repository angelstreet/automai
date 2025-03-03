import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', _timestamp: new Date().toISOString() });
}
