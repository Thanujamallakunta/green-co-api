import { IsNotEmpty, IsNumber, IsOptional, IsString, IsIn } from 'class-validator';

export class ApproveWorkOrderDto {
  @IsNotEmpty()
  @IsNumber()
  @IsIn([1, 2]) // 1 = Accepted, 2 = Rejected
  wo_status: number;

  @IsOptional()
  @IsString()
  wo_remarks?: string; // Required when rejecting (wo_status = 2)
}



