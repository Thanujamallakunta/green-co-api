import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FacilitatorDocument = Facilitator & Document;

@Schema({ timestamps: true })
export class Facilitator {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ default: '1' })
  status: string;
}

export const FacilitatorSchema = SchemaFactory.createForClass(Facilitator);

