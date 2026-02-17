import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CompanyFacilitatorDocument = CompanyFacilitator & Document;

@Schema({ timestamps: true })
export class CompanyFacilitator {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
  company_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CompanyProject', required: true })
  project_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  facilitator_id: MongooseSchema.Types.ObjectId;
}

export const CompanyFacilitatorSchema = SchemaFactory.createForClass(CompanyFacilitator);

