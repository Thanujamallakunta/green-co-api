import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyProjectsController } from './company-projects.controller';
import { CompanyProjectsService } from './company-projects.service';
import {
  CompanyProject,
  CompanyProjectSchema,
} from '../schemas/company-project.schema';
import { Company, CompanySchema } from '../schemas/company.schema';
import {
  CompanyFacilitator,
  CompanyFacilitatorSchema,
} from '../schemas/company-facilitator.schema';
import {
  CompanyCoordinator,
  CompanyCoordinatorSchema,
} from '../schemas/company-coordinator.schema';
import {
  CompanyAssessor,
  CompanyAssessorSchema,
} from '../schemas/company-assessor.schema';
import {
  CompanyActivity,
  CompanyActivitySchema,
} from '../schemas/company-activity.schema';
import {
  CompanyWorkOrder,
  CompanyWorkOrderSchema,
} from '../schemas/company-workorder.schema';
import { Sector, SectorSchema } from '../schemas/sector.schema';
import {
  Facilitator,
  FacilitatorSchema,
} from '../schemas/facilitator.schema';
import {
  Coordinator,
  CoordinatorSchema,
} from '../schemas/coordinator.schema';
import { Assessor, AssessorSchema } from '../schemas/assessor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanyProject.name, schema: CompanyProjectSchema },
      { name: Company.name, schema: CompanySchema },
      { name: CompanyFacilitator.name, schema: CompanyFacilitatorSchema },
      { name: CompanyCoordinator.name, schema: CompanyCoordinatorSchema },
      { name: CompanyAssessor.name, schema: CompanyAssessorSchema },
      { name: CompanyActivity.name, schema: CompanyActivitySchema },
      { name: CompanyWorkOrder.name, schema: CompanyWorkOrderSchema },
      { name: Sector.name, schema: SectorSchema },
      { name: Facilitator.name, schema: FacilitatorSchema },
      { name: Coordinator.name, schema: CoordinatorSchema },
      { name: Assessor.name, schema: AssessorSchema },
    ]),
  ],
  controllers: [CompanyProjectsController],
  providers: [CompanyProjectsService],
})
export class CompanyProjectsModule {}


