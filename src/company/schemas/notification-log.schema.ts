import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

/** Module codes: A = Admin, C = Company, F = Facilitator, CO = Coordinator, AS = Assessor */
export type NotifyType = 'A' | 'C' | 'F' | 'CO' | 'AS';

export type NotificationLogDocument = NotificationLog & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class NotificationLog {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  notify_type: NotifyType;

  /** Optional for Admin (A) when broadcast; otherwise user_id of Company/Facilitator/Coordinator/Assessor */
  @Prop({ type: MongooseSchema.Types.ObjectId, required: false })
  user_id?: MongooseSchema.Types.ObjectId;

  @Prop({ default: false })
  seen: boolean;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);
NotificationLogSchema.index({ notify_type: 1, user_id: 1 });
NotificationLogSchema.index({ user_id: 1, seen: 1, createdAt: -1 });
