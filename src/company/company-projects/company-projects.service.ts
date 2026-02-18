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

interface CertificateDocument {
  url: string;
  filename: string;
}

interface CertificateSummary {
  projectId: string;
  company_name?: string;
  certificate_document: CertificateDocument | null;
  feedback_document: CertificateDocument | null;
  score_band_status: 0 | 1;
  score_band?: {
    percentage_score: number;
    criteria_projectscore: any[];
    high_projectscore: any[];
    max_score: any[];
  };
}

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
  ): Promise<{ status: 'success'; data: CertificateSummary }> {
    const project = await this.projectModel.findOne({
      _id: projectId,
      company_id: companyId,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const company = await this.companyModel.findById(project.company_id);

    const certificate_document: CertificateDocument | null =
      project.certificate_document_url && project.certificate_document_filename
        ? {
            url: project.certificate_document_url,
            filename: project.certificate_document_filename,
          }
        : null;

    const feedback_document: CertificateDocument | null =
      project.feedback_document_url && project.feedback_document_filename
        ? {
            url: project.feedback_document_url,
            filename: project.feedback_document_filename,
          }
        : null;

    const score_band_status = (project.score_band_status || 0) as 0 | 1;

    const summary: CertificateSummary = {
      projectId: project._id.toString(),
      company_name: company?.name,
      certificate_document,
      feedback_document,
      score_band_status,
    };

    if (score_band_status === 1) {
      summary.score_band = {
        percentage_score: project.percentage_score || 0,
        criteria_projectscore: project.criteria_projectscore || [],
        high_projectscore: project.high_projectscore || [],
        max_score: project.max_score || [],
      };
    }

    return {
      status: 'success',
      data: summary,
    };
  }

  async getScoreBandPdfPath(companyId: string, projectId: string): Promise<string> {
    const project = await this.projectModel.findOne({
      _id: projectId,
      company_id: companyId,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.score_band_pdf_path) {
      throw new NotFoundException('Score band PDF not available');
    }

    const relativePath = project.score_band_pdf_path;
    const absolutePath = join(process.cwd(), relativePath);

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Score band PDF file not found on server');
    }

    return absolutePath;
  }
}


