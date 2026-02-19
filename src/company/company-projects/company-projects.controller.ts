import {
  Controller,
  Get,
  Param,
  Request,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { CompanyProjectsService } from './company-projects.service';
import { JwtAuthGuard } from '../company-auth/guards/jwt-auth.guard';
import { AccountStatusGuard } from '../company-auth/guards/account-status.guard';
import { join } from 'path';
import * as fs from 'fs';

@Controller('api/company/projects')
export class CompanyProjectsController {
  constructor(
    private readonly companyProjectsService: CompanyProjectsService,
  ) {}

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

  @Get(':projectId/scoreband-download')
  @UseGuards(JwtAuthGuard, AccountStatusGuard)
  async downloadScoreBand(
    @Request() req,
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    try {
      const pdfPath = await this.companyProjectsService.getScoreBandPdfPath(
        req.user.userId,
        projectId,
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Score_Band.pdf"',
      );

      return res.sendFile(pdfPath);
    } catch (error) {
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

  // Serve certificate document
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

  // Serve feedback document
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
}
