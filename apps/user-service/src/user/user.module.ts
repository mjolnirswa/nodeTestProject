import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { UserController } from './user.controller';
import { RefreshToken } from '../auth/entity/refresh-token.entity';
import { NatsClientModule } from '../nats/nats-client.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken]), NatsClientModule],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
