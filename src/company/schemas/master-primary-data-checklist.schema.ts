import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MasterPrimaryDataChecklistDocument = MasterPrimaryDataChecklist & Document;

/**
 * Master checklist for Primary Data Form (sections: gi, ee, wc, re, gge, wm, mcr, gsc, ps, gin, tar).
 * Company rows in primary_data_form reference this via data_id.
 */
@Schema({ timestamps: true, collection: 'master_primary_data_checklist' })
export class MasterPrimaryDataChecklist {
  @Prop()
  checklist_name?: string;

  @Prop({ default: 0 })
  checklist_order?: number;

  @Prop()
  is_calculate?: number;

  @Prop()
  parameter?: string;

  @Prop()
  info_type?: string; // gi, ee, wc, re, gge, wm, mcr, gsc, ps, gin, tar

  @Prop()
  reference_unit?: string;

  @Prop({ default: 1 })
  is_active?: number;
}

export const MasterPrimaryDataChecklistSchema = SchemaFactory.createForClass(MasterPrimaryDataChecklist);
