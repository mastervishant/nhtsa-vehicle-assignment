import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloDriver,
  ApolloDriverConfig,
} from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';

import { AppCacheModule } from './cache/cache.module';
import { AppConfigModule } from './config/config.module';
import { MakesModule } from './makes/makes.module';

@Module({
  imports: [
    AppConfigModule,

    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],

      useFactory: (
        configService: ConfigService,
      ) => ({
        pinoHttp: {
          level: configService.get<string>(
            'logging.level',
            'info',
          ),

          transport:
            configService.get<string>(
              'app.environment',
              'development',
            ) !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'SYS:standard',
                  },
                }
              : undefined,
        },
      }),
    }),

    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],

      useFactory: (
        configService: ConfigService,
      ) => ({
        type: 'postgres' as const,

        host: configService.get<string>(
          'database.host',
          'localhost',
        ),

        port: configService.get<number>(
          'database.port',
          5432,
        ),

        username: configService.get<string>(
          'database.username',
          'postgres',
        ),

        password: configService.get<string>(
          'database.password',
          'postgres',
        ),

        database: configService.get<string>(
          'database.name',
          'nhtsa',
        ),

        autoLoadEntities: true,

        synchronize: configService.get<boolean>(
          'database.synchronize',
          false,
        ),
      }),
    }),

    AppCacheModule,

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
    }),

    MakesModule,
  ],
})
export class AppModule {}