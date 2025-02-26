import { NextRequest, NextResponse } from 'next/server';
import { initSocketServer } from '@/app/lib/socket';

// API route handler
export async function GET(req: NextRequest) {
  // Initialize Socket.IO server
  const socketServer = initSocketServer();
  
  // Return a response to acknowledge the request
  return new NextResponse(JSON.stringify({ status: 'Socket server running' }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
