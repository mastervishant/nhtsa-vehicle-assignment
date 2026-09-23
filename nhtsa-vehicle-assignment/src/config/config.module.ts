import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import configuration from './configuration';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],

      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid(
            'development',
            'test',
            'production',
          )
          .default('development'),

        PORT: Joi.number()
          .port()
          .default(3000),

        DATABASE_HOST: Joi.string()
          .default('localhost'),

        DATABASE_PORT: Joi.number()
          .port()
          .default(5432),

        DATABASE_USER: Joi.string()
          .default('postgres'),

        DATABASE_PASSWORD: Joi.string()
          .default('postgres'),

        DATABASE_NAME: Joi.string()
          .default('nhtsa'),

        DB_SYNCHRONIZE: Joi.boolean()
          .truthy('true')
          .falsy('false')
          .default(false),

        NHTSA_BASE_URL: Joi.string()
          .uri()
          .default(
            'https://vpic.nhtsa.dot.gov/api/vehicles',
          ),

        NHTSA_TIMEOUT_MS: Joi.number()
          .integer()
          .min(1000)
          .default(30000),

        NHTSA_RETRIES: Joi.number()
          .integer()
          .min(0)
          .max(10)
          .default(3),

        LOG_LEVEL: Joi.string()
          .valid(
            'fatal',
            'error',
            'warn',
            'info',
            'debug',
            'trace',
            'silent',
          )
          .default('info'),

        CACHE_TTL_SECONDS: Joi.number()
          .integer()
          .min(0)
          .default(3600),

        CACHE_MAX_ITEMS: Joi.number()
          .integer()
          .min(1)
          .default(20000),
      }),

      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}