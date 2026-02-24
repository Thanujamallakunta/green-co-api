import { IsNotEmpty, IsOptional, IsString, IsArray, IsDateString } from 'class-validator';

export class AssignAssessorDto {
  @IsNotEmpty()
  @IsString()
  assessor_id: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visit_dates?: string[]; // e.g. ['2026-02-20', '2026-02-21']
}
