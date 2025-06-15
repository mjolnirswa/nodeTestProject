import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PinoLogger } from 'nestjs-pino';
import { verifyJwt } from '@app/common/utils/jwt.util';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(NotificationGateway.name);
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    const authHeader = client.handshake.headers.authorization as string | undefined;

    try {
      if (!authHeader?.startsWith('Bearer ')) throw new Error('No Bearer token');

      const token = authHeader.split(' ')[1];
      const payload = verifyJwt(token, process.env.JWT_SECRET!);
      const userId = payload.sub;
      if (!userId) throw new Error('No userId in token');

      client.data.userId = userId;
      client.join(userId.toString());

      this.logger.info({ clientId: client.id, room: userId }, 'client joined');
    } catch (err) {
      this.logger.warn({ clientId: client.id, err }, 'WS auth failed');
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.info({ clientId: client.id }, 'client disconnected');
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: string, @ConnectedSocket() client: Socket): string {
    this.logger.debug({ clientId: client.id, data }, 'ping received');
    return 'pong';
  }

  async sendNotification(userId: string, payload: any) {
    this.server.to(userId).emit('notification', payload);
    this.logger.info({ userId, payload }, 'notification sent');
  }
}
