import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    {
      bufferLogs: true,
    },
  );

  const logger = app.get(Logger);

  app.useLogger(logger);

  const configService =
    app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const port = configService.get<number>(
    'app.port',
    3000,
  );

  const environment =
    configService.get<string>(
      'app.environment',
      'development',
    );

  await app.listen(port);

  logger.log(
    {
      port,
      environment,
    },
    'Application started',
  );

  const shutdown = async (
    signal: string,
  ): Promise<void> => {
    logger.log(
      {
        signal,
      },
      'Application shutdown initiated',
    );

    try {
      await app.close();

      logger.log(
        {
          signal,
        },
        'Application shutdown completed',
      );

      process.exit(0);
    } catch (error) {
      logger.error(
        {
          signal,
          err: error,
        },
        'Application shutdown failed',
      );

      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

bootstrap().catch((error) => {
  console.error(
    'Application failed to start',
    error,
  );

  process.exit(1);
});