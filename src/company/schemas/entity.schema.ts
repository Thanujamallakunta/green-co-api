import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EntityDocument = Entity & Document;

@Schema({ timestamps: true })
export class Entity {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  // 1 = active, 0 = inactive
  @Prop({ default: 1 })
  status: number;
}

export const EntitySchema = SchemaFactory.createForClass(Entity);


