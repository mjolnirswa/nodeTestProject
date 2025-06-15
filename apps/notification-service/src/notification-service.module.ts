import { Module } from '@nestjs/common';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { NotificationModule } from './notification/notification.module';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { pinoHttpOptions } from '@app/logger';

@Module({
  imports: [
    NotificationModule,
    LoggerModule.forRoot({
      pinoHttp: pinoHttpOptions,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
