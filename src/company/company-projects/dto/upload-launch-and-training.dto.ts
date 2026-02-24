import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadLaunchAndTrainingDto {
  @IsOptional()
  @IsString()
  launch_training_report_date?: string; // e.g. YYYY-MM-DD or d-m-Y from frontend
}
