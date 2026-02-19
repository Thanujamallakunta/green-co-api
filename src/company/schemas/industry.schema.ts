import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IndustryDocument = Industry & Document;

@Schema({ timestamps: true })
export class Industry {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  // 1 = active, 0 = inactive
  @Prop({ default: 1 })
  status: number;
}

export const IndustrySchema = SchemaFactory.createForClass(Industry);


