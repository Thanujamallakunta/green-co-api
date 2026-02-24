import { IsOptional, IsString } from 'class-validator';

/** Save primary data (new flow): form_type = "all" or single section (gi, ee, wc, ...). */
export class PrimaryDataSaveDto {
  @IsString()
  form_type: string; // "all" | gi | ee | wc | re | gge | wm | mcr | gsc | ps | gin | tar

  /** When true, sets final_submit = 1 on saved rows */
  @IsOptional()
  final_submit?: boolean;

  /** Section payload: keyed by section or flat list; structure depends on frontend. Pass through to service. */
  @IsOptional()
  data?: Record<string, any>;
}
