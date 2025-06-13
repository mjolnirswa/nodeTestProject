import { Module } from '@nestjs/common';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { NotificationModule } from './notification/notification.module';
import { WinstonModule } from 'nest-winston';
import { winstonOptions } from '@app/logger';

@Module({
  imports: [NotificationModule, WinstonModule.forRoot(winstonOptions)],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
