import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CompanyProject,
  CompanyProjectDocument,
} from '../schemas/company-project.schema';
import { Company, CompanyDocument } from '../schemas/company.schema';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class CompanyProjectsService {
  constructor(
    @InjectModel(CompanyProject.name)
    private readonly projectModel: Model<CompanyProjectDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
  ) {}

  async getCertificateSummary(
    companyId: string,
    projectId: string,
  ): Promise<{
    status: 'success';
    message: string;
    data: {
      profile: {
        id: string;
        name: string | undefined;
        certificate_document: string | null;
        feedback_document: string | null;
        score_band_status: 0 | 1;
      };
      percentage_score: number;
    };
  }> {
    const project = await this.projectModel.findOne({
      _id: projectId,
      company_id: companyId,
    });

    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Project not found',
      });
    }

    const company = await this.companyModel.findById(project.company_id);

    const certificate_document =
      project.certificate_document_url || null;

    const feedback_document = project.feedback_document_url || null;

    const score_band_status = (project.score_band_status || 0) as 0 | 1;

    return {
      status: 'success',
      message: 'Certificate data loaded',
      data: {
        profile: {
          id: project._id.toString(),
          name: company?.name,
          certificate_document,
          feedback_document,
          score_band_status,
        },
        percentage_score: project.percentage_score || 0,
      },
    };
  }

  async getScoreBandPdfPath(companyId: string, projectId: string): Promise<string> {
    const project = await this.projectModel.findOne({
      _id: projectId,
      company_id: companyId,
    });

    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Project not found',
      });
    }

    if (!project.score_band_pdf_path) {
      throw new NotFoundException({
        status: 'error',
        message: 'Score band not available',
      });
    }

    const relativePath = project.score_band_pdf_path;
    const absolutePath = join(process.cwd(), relativePath);

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException({
        status: 'error',
        message: 'Score band PDF file not found on server',
      });
    }

    return absolutePath;
  }
}


