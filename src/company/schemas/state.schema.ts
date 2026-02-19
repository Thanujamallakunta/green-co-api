import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StateDocument = State & Document;

@Schema({ timestamps: true })
export class State {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  // Optional ISO code or short code (e.g. 'TN' for Tamil Nadu)
  @Prop()
  code?: string;

  // 1 = active, 0 = inactive
  @Prop({ default: 1 })
  status: number;
}

export const StateSchema = SchemaFactory.createForClass(State);


