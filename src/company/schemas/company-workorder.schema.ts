import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CompanyWorkOrderDocument = CompanyWorkOrder & Document;

@Schema({ timestamps: true })
export class CompanyWorkOrder {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
  company_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CompanyProject', required: true })
  project_id: MongooseSchema.Types.ObjectId;

  @Prop()
  wo_doc?: string;

  @Prop({ default: 0 }) // 1 = Accepted, 2 = Not Accepted, 0 = Pending
  wo_status?: number;

  @Prop()
  wo_doc_status_updated_at?: Date;
}

export const CompanyWorkOrderSchema = SchemaFactory.createForClass(CompanyWorkOrder);

