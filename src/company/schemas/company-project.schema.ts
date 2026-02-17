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
}

export const CompanyProjectSchema = SchemaFactory.createForClass(CompanyProject);

