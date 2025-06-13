import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ProfileController } from './profile/profile.controller';
import { ProfileModule } from './profile/profile.module';
import { AvatarModule } from './avatar/avatar.module';
import { RedisCacheModule } from './cache/cache.module';
import { BalanceResetModule } from './balance-reset/balance-reset.module';
import { BullModule } from '@nestjs/bull';
import { WinstonModule } from 'nest-winston';
import { winstonOptions } from '@app/logger';
import { NatsClientModule } from './nats/nats-client.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NatsClientModule,
    WinstonModule.forRoot(winstonOptions),
    DatabaseModule,
    UserModule,
    AuthModule,
    ProfileModule,
    AvatarModule,
    RedisCacheModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD', 'yourpassword'),
        },
      }),
    }),
    BalanceResetModule,
  ],
  controllers: [ProfileController],
  providers: [],
})
export class AppModule {}
