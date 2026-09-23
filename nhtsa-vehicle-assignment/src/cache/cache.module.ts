import { Module } from '@nestjs/common';
import {
  CacheModule,
} from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CacheModule.registerAsync({
      inject: [ConfigService],

      useFactory: (
        configService: ConfigService,
      ) => ({
        isGlobal: true,

        ttl: configService.get<number>(
          'cache.ttlSeconds',
          3600,
        ),

        max: configService.get<number>(
          'cache.maxItems',
          20000,
        ),
      }),
    }),
  ],

  exports: [CacheModule],
})
export class AppCacheModule {}