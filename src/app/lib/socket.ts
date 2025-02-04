import { Server as IOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

interface ServerSocket extends NetServer {
  io?: IOServer;
}

interface ResponseSocket extends NextApiResponse {
  socket: {
    server: ServerSocket;
  };
}

const io = new IOServer({
  path: '/api/socket',
});

export function socketHandler(
  req: NextApiRequest,
  res: ResponseSocket
) {
  if (!res.socket.server.io) {
    res.socket.server.io = io;
  }

  res.socket.server.io.on('connection', async (socket: IOServer['sockets']['socket']) => {
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

  res.end();
}

// Helper function to notify users of new drafts
export async function notifyUser(userId: string, event: string, data?: any) {
  io.to(`user:${userId}`).emit(event, data);
} 