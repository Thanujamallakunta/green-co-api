import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

/** Update assessment submittal approval status and/or remarks. */
export class UpdateAssessmentSubmittalDto {
  /** 0=Pending, 1=Accepted, 2=Not Accepted, 3=Under Review */
  @IsOptional()
  @IsNumber()
  @IsIn([0, 1, 2, 3], { message: 'document_status must be 0, 1, 2, or 3' })
  document_status?: number;

  @IsOptional()
  @IsString()
  document_remarks?: string;
}
