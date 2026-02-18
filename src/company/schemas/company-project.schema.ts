import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CompanyProjectDocument = CompanyProject & Document;

@Schema({ timestamps: true })
export class CompanyProject {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
  company_id: MongooseSchema.Types.ObjectId;

  @Prop({ default: 'c' }) // 'c' = cii, 'f' = facilitator
  process_type: string;

  @Prop({ default: 1 })
  next_activities_id: number;

  // Certificate & feedback documents (optional)
  @Prop()
  certificate_document_url?: string;

  @Prop()
  certificate_document_filename?: string;

  @Prop()
  feedback_document_url?: string;

  @Prop()
  feedback_document_filename?: string;

  // Score band metadata
  @Prop({ default: 0 }) // 0 = not available, 1 = available
  score_band_status: number;

  @Prop()
  percentage_score?: number;

  @Prop({ type: Array, default: [] })
  criteria_projectscore?: any[];

  @Prop({ type: Array, default: [] })
  high_projectscore?: any[];

  @Prop({ type: Array, default: [] })
  max_score?: any[];

  // Optional path to generated score band PDF
  @Prop()
  score_band_pdf_path?: string;
}

export const CompanyProjectSchema = SchemaFactory.createForClass(CompanyProject);
