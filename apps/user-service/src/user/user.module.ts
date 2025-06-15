import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

import { User } from './entity/user.entity';
import { RefreshToken } from '../auth/entity/refresh-token.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { NatsClientModule } from '../nats/nats-client.module';

const metricsProviders = [
  // сколько пользователей успешно создано
  makeCounterProvider({
    name: 'user_created_total',
    help: 'Total number of users created',
  }),

  // время регистрации пользователя (histogram, чтобы можно было p95 и т. д.)
  makeHistogramProvider({
    name: 'user_create_duration_seconds',
    help: 'Duration of user registration in seconds',
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  }),

  makeCounterProvider({
    name: 'balance_transfer_total',
    help: 'Total balance-transfer attempts',
    labelNames: ['result'],
  }),

  makeHistogramProvider({
    name: 'balance_transfer_duration_seconds',
    help: 'Duration of balance transfers in seconds',
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  }),
];

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken]), NatsClientModule],
  providers: [UserService, ...metricsProviders],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
