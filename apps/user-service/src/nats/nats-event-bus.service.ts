import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class NatsEventBusService implements OnModuleInit {
  constructor(@Inject('NATS_CLIENT') private readonly client: ClientProxy) {}

  async onModuleInit() {
    await this.client.connect();
  }

  publish<T = any>(subject: string, payload: T) {
    return this.client.emit(subject, payload);
  }

  emitBalanceUpdated(userId: number, delta: number) {
    return this.publish('balance_updated', {
      userId: userId.toString(),
      amount: delta,
    });
  }
}
