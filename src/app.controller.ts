import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      status: 'success',
      message: 'Green Co API is running',
      version: '1.0.0',
      endpoints: {
        auth: '/api/company/auth',
        register: '/api/company/auth/register',
        login: '/api/company/auth/login',
        forgotPassword: '/api/company/auth/forgot-password',
      },
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'success',
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
    };
  }
}

