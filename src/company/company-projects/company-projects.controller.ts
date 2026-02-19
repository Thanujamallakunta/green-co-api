import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { CompanyProjectsService } from './company-projects.service';
import { JwtAuthGuard } from '../company-auth/guards/jwt-auth.guard';
import { AccountStatusGuard } from '../company-auth/guards/account-status.guard';
import { join } from 'path';
import * as fs from 'fs';
import { CompleteMilestoneDto } from './dto/complete-milestone.dto';
import { RegistrationInfoDto } from './dto/registration-info.dto';

@Controller('api/company/projects')
export class CompanyProjectsController {
  constructor(
    private readonly companyProjectsService: CompanyProjectsService,
  ) {}

  // Test route to verify controller is working
  @Get('test')
  testRoute() {
    return { status: 'success', message: 'CompanyProjectsController is working' };
  }

  // More specific routes first to avoid route conflicts
  @Get(':projectId/scoreband-download')
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  async downloadScoreBand(
    @Request() req,
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    console.log(`[ScoreBand Download] Request received for projectId: ${projectId}`);
    try {
      const pdfPath = await this.companyProjectsService.getScoreBandPdfPath(
        req.user.userId,
        projectId,
      );

      console.log(`[ScoreBand Download] PDF path: ${pdfPath}`);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Score_Band.pdf"',
      );

      return res.sendFile(pdfPath);
    } catch (error) {
      console.error(`[ScoreBand Download] Error:`, error);
      // If it's already a NotFoundException with proper format, re-throw it
      if (error instanceof NotFoundException) {
        throw error;
      }
      // For any other errors, return generic error
      return res.status(500).json({
        status: 'error',
        message: 'Failed to download score band PDF',
      });
    }
  }

  @Get(':projectId/certificate-document')
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  async getCertificateDocument(
    @Request() req,
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    const project = await this.companyProjectsService.getProject(
      req.user.userId,
      projectId,
    );

    if (!project.certificate_document_url) {
      throw new NotFoundException({
        status: 'error',
        message: 'Certificate document not found',
      });
    }

    const filePath = join(process.cwd(), project.certificate_document_url);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException({
        status: 'error',
        message: 'Certificate file not found on server',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${project.certificate_document_filename || 'certificate.pdf'}"`,
    );

    return res.sendFile(filePath);
  }

  @Get(':projectId/feedback-document')
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  async getFeedbackDocument(
    @Request() req,
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    const project = await this.companyProjectsService.getProject(
      req.user.userId,
      projectId,
    );

    if (!project.feedback_document_url) {
      throw new NotFoundException({
        status: 'error',
        message: 'Feedback document not found',
      });
    }

    const filePath = join(process.cwd(), project.feedback_document_url);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException({
        status: 'error',
        message: 'Feedback file not found on server',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${project.feedback_document_filename || 'feedback.pdf'}"`,
    );

    return res.sendFile(filePath);
  }

  @Get(':projectId/certificate')
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  async getCertificateSummary(
    @Request() req,
    @Param('projectId') projectId: string,
  ): Promise<any> {
    return this.companyProjectsService.getCertificateSummary(
      req.user.userId,
      projectId,
    );
  }

  @Get(':projectId/quickview')
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  async getQuickview(
    @Request() req,
    @Param('projectId') projectId: string,
  ): Promise<any> {
    return this.companyProjectsService.getQuickviewData(
      req.user.userId,
      projectId,
    );
  }

  @Post(':projectId/milestones')
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async completeMilestone(
    @Request() req,
    @Param('projectId') projectId: string,
    @Body() dto: CompleteMilestoneDto,
  ): Promise<any> {
    return this.companyProjectsService.completeMilestone(
      req.user.userId,
      projectId,
      dto,
    );
  }

  @Post(':projectId/registration-info')
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async saveRegistrationInfo(
    @Request() req,
    @Param('projectId') projectId: string,
    @Body() dto: RegistrationInfoDto,
  ): Promise<any> {
    return this.companyProjectsService.saveRegistrationInfo(
      req.user.userId,
      projectId,
      dto,
    );
  }

  @Get(':projectId/registration-info')
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  async getRegistrationInfo(
    @Request() req,
    @Param('projectId') projectId: string,
  ): Promise<any> {
    return this.companyProjectsService.getRegistrationInfo(
      req.user.userId,
      projectId,
    );
  }
}
