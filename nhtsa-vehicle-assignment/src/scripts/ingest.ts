import 'reflect-metadata';

import {
  NestFactory
} from '@nestjs/core';

import {
  AppModule
} from '../app.module';

import {
  MakesService
} from '../makes/makes.service';

async function run(): Promise<void> {

  const app =
    await NestFactory.createApplicationContext(
      AppModule,
      {
        logger: [
          'log',
          'warn',
          'error'
        ]
      }
    );

  try {

    const service =
      app.get(MakesService);

    const result =
      await service.ingest();

    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    );

  } finally {

    await app.close();
  }
}

run().catch(
  error => {

    console.error(error);

    process.exit(1);
  }
);