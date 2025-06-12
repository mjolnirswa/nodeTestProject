import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from '@keyv/redis';

@Global()
@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD', '');

        const url = password ? `redis://:${password}@${host}:${port}` : `redis://${host}:${port}`;

        return {
          store: new Redis(url),
          ttl: 30 * 1000,
        };
      },
    }),
  ],
})
export class RedisCacheModule {}
