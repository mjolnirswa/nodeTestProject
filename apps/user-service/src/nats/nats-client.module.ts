import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NatsEventBusService } from './nats-event-bus.service';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'NATS_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [config.getOrThrow('NATS_SERVERS')],
            user: config.get<string>('NATS_USERNAME'),
            pass: config.get<string>('NATS_PASSWORD'),
          },
        }),
      },
    ]),
  ],
  providers: [NatsEventBusService],
  exports: [ClientsModule, NatsEventBusService],
})
export class NatsClientModule {}
