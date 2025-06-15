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
import { NatsClientModule } from './nats/nats-client.module';
import { LoggerModule } from 'nestjs-pino';
import { pinoHttpOptions } from '@app/logger';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [
    PrometheusModule.register(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NatsClientModule,
    LoggerModule.forRoot({
      pinoHttp: pinoHttpOptions,
    }),
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
  controllers: [ProfileController, MetricsController],
  providers: [],
})
export class AppModule {}
