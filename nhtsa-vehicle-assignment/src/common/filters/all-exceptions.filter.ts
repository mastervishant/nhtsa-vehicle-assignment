import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';

import { GqlArgumentsHost } from '@nestjs/graphql';

@Catch()
export class AllExceptionsFilter
  implements ExceptionFilter
{
  private readonly logger =
    new Logger(AllExceptionsFilter.name);

  catch(
    exception: unknown,
    host: ArgumentsHost,
  ): void {
    const gqlHost =
      GqlArgumentsHost.create(host);

    const info = gqlHost.getInfo();

    const message =
      exception instanceof Error
        ? exception.message
        : String(exception);

    const stack =
      exception instanceof Error
        ? exception.stack
        : undefined;

    this.logger.error(
      `Unhandled exception | ` +
        `operation=${info?.fieldName ?? 'unknown'} | ` +
        `message=${message}`,
      stack,
    );

    if (exception instanceof HttpException) {
      return;
    }

    throw exception;
  }
}