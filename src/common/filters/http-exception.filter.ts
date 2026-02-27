import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Special case: never return an error for CORS preflight.
    // If an OPTIONS request accidentally reaches this filter (e.g. no route),
    // answer with 200 so the browser can proceed with the real request.
    if (request.method === 'OPTIONS') {
      response
        .status(200)
        .setHeader('Access-Control-Allow-Origin', request.headers.origin || '*')
        .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        .setHeader(
          'Access-Control-Allow-Headers',
          request.headers['access-control-request-headers'] || 'Content-Type, Authorization, Accept, X-Requested-With',
        )
        .setHeader('Access-Control-Allow-Credentials', 'true')
        .end();
      return;
    }

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



