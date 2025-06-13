import { Module } from '@nestjs/common';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { NotificationModule } from './notification/notification.module';
import { WinstonModule } from 'nest-winston';
import { winstonOptions } from '@app/logger';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    NotificationModule,
    WinstonModule.forRoot(winstonOptions),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
