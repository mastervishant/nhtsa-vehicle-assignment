import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MakesModule } from './makes/makes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (config: ConfigService) => ({
        type: 'postgres',

        host: config.get<string>(
          'DATABASE_HOST',
          'localhost'
        ),

        port: config.get<number>(
          'DATABASE_PORT',
          5432
        ),

        username: config.get<string>(
          'DATABASE_USER',
          'postgres'
        ),

        password: config.get<string>(
          'DATABASE_PASSWORD',
          'postgres'
        ),

        database: config.get<string>(
          'DATABASE_NAME',
          'nhtsa'
        ),

        autoLoadEntities: true,

        synchronize:
          config.get<string>(
            'DB_SYNCHRONIZE',
            'true'
          ) === 'true'
      })
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,

      autoSchemaFile: true,

      sortSchema: true,

      introspection: true
    }),

    MakesModule
  ]
})
export class AppModule {}