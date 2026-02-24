import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CompanyResourceDocumentDocument = CompanyResourceDocument & Document;

@Schema({ timestamps: true, collection: 'companyresourcedocuments' })
export class CompanyResourceDocument {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
  company_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CompanyProject', required: true })
  project_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  document_url: string;

  @Prop({ required: true })
  document_filename: string;

  @Prop()
  document_title?: string;

  @Prop()
  document_type?: string; // e.g., 'launch_training', 'hand_holding_1', 'assessment_submittal', etc.

  @Prop()
  description?: string;

  /** 0=Pending, 1=Accepted, 2=Not Accepted, 3=Under Review (for assessment submittals) */
  @Prop({ default: 0 })
  document_status?: number;

  /** Remarks from reviewer (approval/rejection notes) for assessment submittals */
  @Prop()
  document_remarks?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ChecklistCriterion' })
  criteria_id?: MongooseSchema.Types.ObjectId;

  @Prop({ default: true })
  is_active: boolean;
}

export const CompanyResourceDocumentSchema = SchemaFactory.createForClass(CompanyResourceDocument);



