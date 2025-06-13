import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { NotificationServiceModule } from './notification-service.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);
  const config = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [config.get<string>('NATS_SERVERS')],
      queue: 'notification_queue',
      user: config.get<string>('NATS_USERNAME'),
      pass: config.get<string>('NATS_PASSWORD'),
    },
  });

  await app.startAllMicroservices();
  await app.listen(3001);
}
bootstrap();
