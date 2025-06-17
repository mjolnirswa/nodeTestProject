import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entity/user.entity';
import { RefreshToken } from '../auth/entity/refresh-token.entity';

import { UsersRepository } from './user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';

import { MetricsModule } from '../metrics/metrics.module';
import { NatsClientModule } from '../nats/nats-client.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken]), MetricsModule, NatsClientModule],
  providers: [UsersRepository, UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
