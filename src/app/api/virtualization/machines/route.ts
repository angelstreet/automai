import { NextResponse } from 'next/server';
import { mockMachines } from '@/constants/virtualization';
import { Machine } from '@/types/virtualization';

// Use a global variable to persist data between requests
declare global {
  var globalMachines: Machine[];
}

// Initialize if not already initialized
if (!global.globalMachines) {
  global.globalMachines = [...mockMachines];
}

// GET /api/virtualization/machines
export async function GET() {
  return NextResponse.json({
    success: true,
    data: global.globalMachines,
  });
}

// POST /api/virtualization/machines
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, type, ip, port, user, password } = body;
    
    if (!name || !type || !ip) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: name, type, and ip are required',
      }, { status: 400 });
    }

    if (type === 'ssh' && (!user || !password)) {
      return NextResponse.json({
        success: false,
        message: 'SSH connections require user and password',
      }, { status: 400 });
    }

    // Create new machine
    const newMachine: Machine = {
      id: `machine-${Date.now()}`,
      name,
      description,
      type: type as 'ssh' | 'docker' | 'portainer',
      ip,
      port: port ? Number(port) : undefined,
      user: type === 'ssh' ? user : undefined,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    global.globalMachines.push(newMachine);

    return NextResponse.json({
      success: true,
      data: newMachine,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating machine:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
} 