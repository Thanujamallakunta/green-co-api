import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CompanyProject,
  CompanyProjectDocument,
} from '../schemas/company-project.schema';
import { Company, CompanyDocument } from '../schemas/company.schema';
import { CompanyFacilitator, CompanyFacilitatorDocument } from '../schemas/company-facilitator.schema';
import { CompanyCoordinator, CompanyCoordinatorDocument } from '../schemas/company-coordinator.schema';
import { CompanyAssessor, CompanyAssessorDocument } from '../schemas/company-assessor.schema';
import { CompanyActivity, CompanyActivityDocument } from '../schemas/company-activity.schema';
import { CompanyWorkOrder, CompanyWorkOrderDocument } from '../schemas/company-workorder.schema';
import { Sector, SectorDocument } from '../schemas/sector.schema';
import { Facilitator, FacilitatorDocument } from '../schemas/facilitator.schema';
import { Coordinator, CoordinatorDocument } from '../schemas/coordinator.schema';
import { Assessor, AssessorDocument } from '../schemas/assessor.schema';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class CompanyProjectsService {
  constructor(
    @InjectModel(CompanyProject.name)
    private readonly projectModel: Model<CompanyProjectDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(CompanyFacilitator.name)
    private readonly companyFacilitatorModel: Model<CompanyFacilitatorDocument>,
    @InjectModel(CompanyCoordinator.name)
    private readonly companyCoordinatorModel: Model<CompanyCoordinatorDocument>,
    @InjectModel(CompanyAssessor.name)
    private readonly companyAssessorModel: Model<CompanyAssessorDocument>,
    @InjectModel(CompanyActivity.name)
    private readonly companyActivityModel: Model<CompanyActivityDocument>,
    @InjectModel(CompanyWorkOrder.name)
    private readonly companyWorkOrderModel: Model<CompanyWorkOrderDocument>,
    @InjectModel(Sector.name)
    private readonly sectorModel: Model<SectorDocument>,
    @InjectModel(Facilitator.name)
    private readonly facilitatorModel: Model<FacilitatorDocument>,
    @InjectModel(Coordinator.name)
    private readonly coordinatorModel: Model<CoordinatorDocument>,
    @InjectModel(Assessor.name)
    private readonly assessorModel: Model<AssessorDocument>,
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

    // Convert relative paths to full URLs for frontend
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    
    const certificate_document = project.certificate_document_url
      ? project.certificate_document_url.startsWith('http')
        ? project.certificate_document_url
        : `${baseUrl}/api/company/projects/${projectId}/certificate-document`
      : null;

    const feedback_document = project.feedback_document_url
      ? project.feedback_document_url.startsWith('http')
        ? project.feedback_document_url
        : `${baseUrl}/api/company/projects/${projectId}/feedback-document`
      : null;

    const score_band_status = (project.score_band_status || 0) as 0 | 1;

    // Return format that matches frontend expectations
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

  async getProject(companyId: string, projectId: string) {
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

    return project;
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

  async saveRegistrationInfo(
    companyId: string,
    projectId: string,
    dto: Record<string, any>,
  ) {
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

    // Store raw form data under registration_info
    project.registration_info = {
      ...(project.registration_info || {}),
      ...dto,
    };
    await project.save();

    // Optionally mirror some fields onto Company for Quickview/profile
    const company = await this.companyModel.findById(companyId);
    if (company) {
      if (dto.sector_id) {
        company.mst_sector_id = dto.sector_id;
      }
      if (dto.turnover) {
        company.turnover = dto.turnover;
      }
      await company.save();
    }

    return {
      status: 'success',
      message: 'Registration info saved successfully',
    };
  }

  async getRegistrationInfo(companyId: string, projectId: string) {
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

    return {
      status: 'success',
      message: 'Registration info loaded successfully',
      data: project.registration_info || {},
    };
  }

  async completeMilestone(
    companyId: string,
    projectId: string,
    dto: { milestone_flow: number; description: string; completed?: boolean },
  ) {
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

    const isCompleted = dto.completed !== undefined ? dto.completed : true;

    await this.companyActivityModel.create({
      company_id: project.company_id,
      project_id: project._id,
      description: dto.description,
      activity_type: 'cii',
      milestone_flow: dto.milestone_flow,
      milestone_completed: isCompleted,
    });

    if (isCompleted) {
      project.next_activities_id = dto.milestone_flow + 1;
      await project.save();
    }

    return {
      status: 'success',
      message: 'Milestone recorded successfully',
    };
  }

  async getQuickviewData(
    companyId: string,
    projectId: string,
  ): Promise<{
    status: 'success';
    message: string;
    data: any;
  }> {
    // Get project and verify it belongs to the company
    const project = await this.projectModel.findOne({
      _id: projectId,
      company_id: companyId,
    });

    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Project not found or quickview not available.',
      });
    }

    // Get company details
    const company = await this.companyModel.findById(companyId);
    if (!company) {
      throw new NotFoundException({
        status: 'error',
        message: 'Company not found.',
      });
    }

    // Get sector information
    let sector = null;
    if (company.mst_sector_id) {
      sector = await this.sectorModel.findById(company.mst_sector_id);
    }

    // Get all activities to determine completed milestones
    const allActivities = await this.companyActivityModel
      .find({
        company_id: companyId,
        project_id: projectId,
      })
      .sort({ createdAt: -1 });

    // Find the latest completed milestone
    const completedMilestone = allActivities.find(
      (activity) => activity.milestone_completed === true && activity.milestone_flow,
    );

    // Get current activity (latest CII activity)
    const currentActivity = await this.companyActivityModel
      .findOne({
        company_id: companyId,
        project_id: projectId,
        activity_type: 'cii',
      })
      .sort({ createdAt: -1 });

    // Get work order (latest)
    const workOrder = await this.companyWorkOrderModel
      .findOne({
        company_id: companyId,
        project_id: projectId,
      })
      .sort({ createdAt: -1 });

    // Get facilitator
    const companyFacilitator = await this.companyFacilitatorModel
      .findOne({
        company_id: companyId,
        project_id: projectId,
      })
      .populate('facilitator_id');

    let facilitatorData = null;
    if (companyFacilitator && companyFacilitator.facilitator_id) {
      const facilitator = await this.facilitatorModel.findById(
        companyFacilitator.facilitator_id,
      );
      if (facilitator) {
        facilitatorData = {
          Facilitator_Detail: {
            name: facilitator.name,
            email: facilitator.email,
          },
          contract_doc_status: 1, // Assuming contract is signed if facilitator exists
        };
      }
    }

    // Get coordinator
    const companyCoordinator = await this.companyCoordinatorModel
      .findOne({
        company_id: companyId,
        project_id: projectId,
      })
      .populate('coordinator_id');

    let coordinatorData = null;
    if (companyCoordinator && companyCoordinator.coordinator_id) {
      const coordinator = await this.coordinatorModel.findById(
        companyCoordinator.coordinator_id,
      );
      if (coordinator) {
        coordinatorData = {
          Coordinator_Detail: {
            name: coordinator.name,
            email: coordinator.email,
          },
        };
      }
    }

    // Get assessors (multiple)
    const companyAssessors = await this.companyAssessorModel.find({
      company_id: companyId,
      project_id: projectId,
    });

    const assessorsData = [];
    for (const companyAssessor of companyAssessors) {
      const assessor = await this.assessorModel.findById(
        companyAssessor.assessor_id,
      );
      if (assessor) {
        assessorsData.push({
          Assessor_Detail: {
            name: assessor.name,
            email: assessor.email,
          },
          visit_dates: companyAssessor.visit_dates || [],
        });
      }
    }

    // Get all company activities (already fetched above, reuse)
    const activitiesData = allActivities.map((activity) => ({
      description: activity.description,
      created_at: (activity as any).createdAt
        ? (activity as any).createdAt.toISOString()
        : new Date().toISOString(),
    }));

    // Get last activity for milestone calculation
    const lastActivity = allActivities.length > 0 ? allActivities[0] : null;

    // Milestone steps (static data)
    const milestoneSteps = {
      '1': 'Plant registers for GreenCo Rating Online',
      '2': 'GreenCo Launch & Handholding',
      '3': 'Primary Data Submission',
      '4': 'Data submission for Assessment',
      '5': 'Site Visit Assessment',
      '6': 'Award of Rating',
      '7': 'Feedback Report',
      '8': 'Sustenance',
    };

    // Milestone responsibility map
    const milestoneResponsibilityMap: Record<number, string> = {
      1: 'Company',
      2: 'CII',
      3: 'Company',
      4: 'Company',
      5: 'Assessor',
      6: 'CII',
      7: 'CII',
      8: 'Company',
    };

    // Determine latest completed milestone
    const latestCompletedMilestoneNumber = completedMilestone?.milestone_flow || 0;
    const latestCompletedMilestoneName = latestCompletedMilestoneNumber > 0
      ? milestoneSteps[latestCompletedMilestoneNumber.toString() as keyof typeof milestoneSteps]
      : null;

    // Determine next milestone (last completed + 1, or use next_activities_id as fallback)
    const nextMilestoneNumber = latestCompletedMilestoneNumber > 0
      ? latestCompletedMilestoneNumber + 1
      : project.next_activities_id || 1;

    // Check if next milestone is already in progress (exists in activities but not completed)
    const nextMilestoneInProgress = allActivities.some(
      (activity) => activity.milestone_flow === nextMilestoneNumber && !activity.milestone_completed,
    );

    const nextMilestoneName = nextMilestoneNumber <= 8
      ? milestoneSteps[nextMilestoneNumber.toString() as keyof typeof milestoneSteps]
      : 'Project Completed';

    const nextActivityInfo = {
      name: nextMilestoneName,
      status: nextMilestoneInProgress ? 'In Progress' : (nextMilestoneNumber > 8 ? 'Completed' : 'Pending'),
      responsibility: milestoneResponsibilityMap[nextMilestoneNumber] || 'N/A',
    };

    // Base URL for document URLs
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

    // Build profile object
    const profile = {
      id: project._id.toString(),
      name: company.name,
      reg_id: company.reg_id || '',
      project_id: project.project_id || project._id.toString(),
      email: company.email,
      mobile: company.mobile,
      turnover: company.turnover || '',
      mst_sector_id: company.mst_sector_id || '',
      account_status: company.account_status,
      status_updated_at: company.status_updated_at
        ? company.status_updated_at.toISOString()
        : (company as any).updatedAt
          ? (company as any).updatedAt.toISOString()
          : new Date().toISOString(),
      process_type: project.process_type,
      proposal_document: project.proposal_document
        ? project.proposal_document.startsWith('http')
          ? project.proposal_document
          : `${baseUrl}/${project.proposal_document}`
        : null,
      feedback_document: project.feedback_document_url
        ? project.feedback_document_url.startsWith('http')
          ? project.feedback_document_url
          : `${baseUrl}/api/company/projects/${projectId}/feedback-document`
        : null,
      next_activity: nextActivityInfo.name,
      next_activity_status: nextActivityInfo.status,
      next_responsibility: nextActivityInfo.responsibility,
    };

    // Build current activity data (Latest Step Completed)
    // Show the latest completed milestone, or fallback to latest activity description
    const currentActivityData = latestCompletedMilestoneName
      ? {
          activity: latestCompletedMilestoneName,
          activity_status: 'Completed',
          responsibility: milestoneResponsibilityMap[latestCompletedMilestoneNumber] || 'Company',
        }
      : currentActivity
        ? {
            activity: currentActivity.description,
            activity_status: 'Done',
            responsibility: 'Company',
          }
        : {
            activity: 'No activity yet',
            activity_status: 'Pending',
            responsibility: 'Company',
          };

    // Build work order data
    const companyWo = workOrder
      ? {
          wo_doc: workOrder.wo_doc
            ? workOrder.wo_doc.startsWith('http')
              ? workOrder.wo_doc
              : `${baseUrl}/${workOrder.wo_doc}`
            : null,
          wo_status: workOrder.wo_status || 0,
          wo_doc_status_updated_at: workOrder.wo_doc_status_updated_at
            ? workOrder.wo_doc_status_updated_at.toISOString()
            : (workOrder as any).updatedAt
              ? (workOrder as any).updatedAt.toISOString()
              : new Date().toISOString(),
        }
      : {
          wo_doc: null,
          wo_status: 0,
          wo_doc_status_updated_at: null,
        };

    // Build last activity data
    const lastActivityData = lastActivity
      ? {
          description: lastActivity.description,
          created_at: (lastActivity as any).createdAt
            ? (lastActivity as any).createdAt.toISOString()
            : new Date().toISOString(),
          milestone_flow: lastActivity.milestone_flow || project.next_activities_id - 1,
          milestone_completed: lastActivity.milestone_completed || false,
        }
      : {
          description: 'Project started',
          created_at: (project as any).createdAt
            ? (project as any).createdAt.toISOString()
            : new Date().toISOString(),
          milestone_flow: 1,
          milestone_completed: false,
        };

    // Build sector data
    const sectorData = sector
      ? {
          name: sector.name,
          group_name: sector.group_name || '',
        }
      : {
          name: '',
          group_name: '',
        };

    return {
      status: 'success',
      message: 'Quickview data loaded successfully',
      data: {
        profile,
        sector: sectorData,
        current_activity_data: currentActivityData,
        company_wo: companyWo,
        companies_facilitator: facilitatorData,
        companies_coordinator: coordinatorData,
        companies_assessors: assessorsData,
        companies_activty: activitiesData,
        milestoeSteps: milestoneSteps,
        last_activity: lastActivityData,
      },
    };
  }
}


