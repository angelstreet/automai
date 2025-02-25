import { NextResponse } from 'next/server';
import { mockMachines } from '@/constants/virtualization';
import { Machine } from '@/types/virtualization';

// Use the same global variable from the main route
declare global {
  var globalMachines: Machine[];
}

// Initialize if not already initialized
if (!global.globalMachines) {
  global.globalMachines = [...mockMachines];
}

// DELETE /api/virtualization/machines/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Find the machine
    const machineIndex = global.globalMachines.findIndex(m => m.id === id);
    
    if (machineIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Machine not found',
      }, { status: 404 });
    }
    
    // Remove the machine
    global.globalMachines.splice(machineIndex, 1);
    
    return NextResponse.json({
      success: true,
      message: 'Machine deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting machine:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
} 