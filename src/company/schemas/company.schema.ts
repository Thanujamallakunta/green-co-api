import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyDocument = Company & Document;

@Schema({ timestamps: true })
export class Company {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, unique: true })
  mobile: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '1' }) // '1' = active, '0' = inactive
  account_status: string;

  @Prop({ default: '0' }) // '1' = verified, '0' = not verified
  verified_status: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

