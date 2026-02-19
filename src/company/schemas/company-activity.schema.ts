import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CompanyActivityDocument = CompanyActivity & Document;

@Schema({ timestamps: true })
export class CompanyActivity {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
  company_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CompanyProject' })
  project_id?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  description: string;

  @Prop()
  activity_type?: string; // 'company' or 'cii'

  @Prop()
  milestone_flow?: number;

  @Prop({ default: false })
  milestone_completed?: boolean;
}

export const CompanyActivitySchema = SchemaFactory.createForClass(CompanyActivity);

