import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CompanyAssessorDocument = CompanyAssessor & Document;

@Schema({ timestamps: true })
export class CompanyAssessor {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
  company_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CompanyProject', required: true })
  project_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  assessor_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: [String], default: [] })
  visit_dates?: string[];
}

export const CompanyAssessorSchema = SchemaFactory.createForClass(CompanyAssessor);

