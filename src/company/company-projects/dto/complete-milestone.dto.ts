import { IsBoolean, IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

export class CompleteMilestoneDto {
  @IsInt()
  @Min(1)
  @Max(8)
  milestone_flow: number;

  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean = true;
}


