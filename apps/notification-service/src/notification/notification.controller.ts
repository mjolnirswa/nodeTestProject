import { Controller } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly gateway: NotificationGateway) {}

  @EventPattern('balance_updated')
  handleBalanceUpdate(@Payload() data: { userId: string; amount: number }) {
    this.gateway.sendNotification(data.userId, { balance: data.amount });
  }
}
