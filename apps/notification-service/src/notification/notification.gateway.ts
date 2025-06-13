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
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LoggerService } from '@nestjs/common';
import { verifyJwt } from '@app/common/utils/jwt.util';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    const authHeader = client.handshake.headers.authorization as string;

    try {
      if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('No Bearer token');
      }

      const token = authHeader.split(' ')[1];
      const payload = verifyJwt(token, process.env.JWT_SECRET!);
      const userId = payload.sub;

      if (!userId) throw new Error('No userId in token');

      client.data.userId = userId;
      client.join(userId.toString());
      this.logger.log(`Client ${client.id} joined room ${userId}`);
    } catch (err) {
      this.logger.warn(`WS Auth failed for ${client.id}: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: string, @ConnectedSocket() client: Socket): string {
    this.logger.log(`Ping from ${client.id}: ${data}`);
    return 'pong';
  }

  async sendNotification(userId: string, payload: any) {
    this.server.to(userId).emit('notification', payload);
    this.logger.log(`Notification sent to user ${userId}: ${JSON.stringify(payload)}`);
  }
}
