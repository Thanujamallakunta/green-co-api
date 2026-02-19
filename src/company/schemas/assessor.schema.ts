import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AssessorDocument = Assessor & Document;

@Schema({ timestamps: true })
export class Assessor {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ default: '1' })
  status: string;
}

export const AssessorSchema = SchemaFactory.createForClass(Assessor);

