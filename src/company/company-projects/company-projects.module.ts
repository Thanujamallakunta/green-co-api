import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyProjectsController } from './company-projects.controller';
import { CompanyProjectsService } from './company-projects.service';
import {
  CompanyProject,
  CompanyProjectSchema,
} from '../schemas/company-project.schema';
import { Company, CompanySchema } from '../schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanyProject.name, schema: CompanyProjectSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [CompanyProjectsController],
  providers: [CompanyProjectsService],
})
export class CompanyProjectsModule {}


