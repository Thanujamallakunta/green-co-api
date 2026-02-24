import { Controller, Get, Patch, Query, Request, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../company-auth/guards/jwt-auth.guard';
import { AccountStatusGuard } from '../company-auth/guards/account-status.guard';
import { NotificationsService } from './notifications.service';

@Controller('api/company/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /api/company/notifications
   * List in-app notifications for the logged-in company (module C).
   */
  @Get()
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  async list(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const result = await this.notificationsService.getForUser(
      'C',
      req.user.userId,
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        skip: skip ? parseInt(skip, 10) : undefined,
      },
    );
    return {
      status: 'success',
      message: 'Notifications loaded',
      data: result,
    };
  }

  /** PATCH /api/company/notifications/seen – mark all as seen */
  @Patch('seen')
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  async markAllSeen(@Request() req) {
    await this.notificationsService.markSeen('C', req.user.userId);
    return { status: 'success', message: 'All notifications marked as seen' };
  }

  /** PATCH /api/company/notifications/:id/seen – mark one as seen */
  @Patch(':id/seen')
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  async markOneSeen(@Request() req, @Param('id') id: string) {
    await this.notificationsService.markSeen('C', req.user.userId, id);
    return { status: 'success', message: 'Notification marked as seen' };
  }
}
