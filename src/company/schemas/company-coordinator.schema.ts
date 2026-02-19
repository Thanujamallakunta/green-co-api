import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CompanyCoordinatorDocument = CompanyCoordinator & Document;

@Schema({ timestamps: true })
export class CompanyCoordinator {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
  company_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CompanyProject', required: true })
  project_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  coordinator_id: MongooseSchema.Types.ObjectId;
}

export const CompanyCoordinatorSchema = SchemaFactory.createForClass(CompanyCoordinator);

