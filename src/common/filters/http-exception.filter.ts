import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // If exception already has our custom format, use it
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'status' in exceptionResponse
    ) {
      return response.status(status).json(exceptionResponse);
    }

    // Otherwise, format it to match our spec
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || exception.message || 'An error occurred';

    return response.status(status).json({
      status: 'error',
      message: message,
    });
  }
}

