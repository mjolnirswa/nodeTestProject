import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
  exports: [ClientsModule],
})
export class NatsClientModule {}
