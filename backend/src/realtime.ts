import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
import { config } from './config';
import { prisma } from './database';
import { AuthPayload, verifyToken } from './lib/auth';

const businessIdSchema = z.coerce.number().int().positive();
const roomOf = (businessId: number) => `business-${businessId}`;

async function canAccess(user: AuthPayload, businessId: number): Promise<boolean> {
  if (user.role === 'admin') return true;
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { user_id: true } });
  return business?.user_id === user.userId;
}

export function attachRealtime(server: HttpServer): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: { origin: config.corsOrigins, methods: ['GET', 'POST'] }
  });

  // Connexion refusée sans JWT valide
  io.use((socket, next) => {
    const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
    const user = token ? verifyToken(token) : null;
    if (!user) return next(new Error('Authentication required'));
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthPayload;

    // Gère un évènement lié à une entreprise, après vérification des droits
    const onBusinessEvent = (event: string, handler: (businessId: number, data: Record<string, unknown>) => void) => {
      socket.on(event, async (payload: unknown) => {
        try {
          const data = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
          const id = businessIdSchema.safeParse(event === 'join-business' ? payload : data.businessId);
          if (!id.success || !(await canAccess(user, id.data))) {
            socket.emit('error-message', { error: 'Forbidden' });
            return;
          }
          handler(id.data, data);
        } catch (error) {
          console.error(`socket ${event} failed:`, error);
        }
      });
    };

    onBusinessEvent('join-business', (businessId) => {
      socket.join(roomOf(businessId));
    });
    onBusinessEvent('update-template', (businessId, data) => {
      io.to(roomOf(businessId)).emit('template-updated', data);
    });
    // Les leads ne sont diffusés qu'à l'entreprise concernée, plus à tout le monde
    onBusinessEvent('lead-update', (businessId, data) => {
      io.to(roomOf(businessId)).emit('lead-updated', data);
    });
  });

  return io;
}
