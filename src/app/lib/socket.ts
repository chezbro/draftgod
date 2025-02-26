import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { Socket } from 'net';

// Define a proper interface for the server with Socket.IO
interface ServerSocket extends NetServer {
  io?: SocketIOServer;
}

// Define a proper interface for the response with the socket property
interface ResponseWithSocket extends NextApiResponse {
  socket: Socket & {
    server: ServerSocket;
  };
}

// Global variable to store the Socket.IO server instance
let io: SocketIOServer | null = null;

// Initialize Socket.IO server if it hasn't been initialized yet
export function initSocketServer() {
  if (!io) {
    // Create a new Socket.IO server
    const httpServer = new NetServer();
    io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    // Set up event handlers
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      socket.on('subscribe', (userId: string) => {
        console.log(`User ${userId} subscribed to updates`);
        socket.join(userId);
      });
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Start the server
    httpServer.listen(3001);
    console.log('Socket.IO server initialized');
  }
  return io;
}

export function socketHandler(
  req: NextApiRequest,
  res: ResponseWithSocket
) {
  // Initialize the Socket.IO server if needed
  const socketServer = initSocketServer();
  
  // Only assign if socketServer is not null
  if (!res.socket.server.io && socketServer) {
    res.socket.server.io = socketServer;
  }

  // Only proceed if we have a valid Socket.IO server
  if (res.socket.server.io) {
    res.socket.server.io.on('connection', async (socket: SocketIOServer['sockets']['socket']) => {
      const session = await getSession({ req });
      if (!session?.user) {
        socket.disconnect();
        return;
      }

      // Join user-specific room
      socket.join(`user:${session.user.id}`);

      socket.on('disconnect', () => {
        socket.leave(`user:${session.user.id}`);
      });
    });
  }

  res.end();
}

// Function to notify a specific user about an event
export async function notifyUser(userId: string, eventType: string, data?: any) {
  const socketServer = initSocketServer();
  if (socketServer) {
    socketServer.to(userId).emit(eventType, data || {});
  }
} 