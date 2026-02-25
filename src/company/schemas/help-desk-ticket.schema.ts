import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

/** Ticket status: open, in_progress, resolved, closed */
export type HelpDeskTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type HelpDeskTicketDocument = HelpDeskTicket & Document;

@Schema({ timestamps: true, collection: 'helpdesktickets' })
export class HelpDeskTicket {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Company' })
  company_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: 'open' })
  status: HelpDeskTicketStatus;

  /** Admin remarks / resolution message (set when status is updated, especially on resolve) */
  @Prop({ default: null })
  remarks: string | null;

  /** When the ticket was resolved (set when status becomes 'resolved') */
  @Prop({ default: null })
  resolved_at: Date | null;

  /** Optional: admin user id who last updated (if you have admin users) */
  @Prop({ type: MongooseSchema.Types.ObjectId, required: false })
  updated_by_admin_id?: MongooseSchema.Types.ObjectId;
}

export const HelpDeskTicketSchema = SchemaFactory.createForClass(HelpDeskTicket);
HelpDeskTicketSchema.index({ company_id: 1, createdAt: -1 });
HelpDeskTicketSchema.index({ status: 1 });
