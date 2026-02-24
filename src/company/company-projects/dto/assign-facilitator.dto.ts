import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AssignFacilitatorDto {
  @IsNotEmpty()
  @IsString()
  facilitator_id: string; // Facilitator master ID

  @IsOptional()
  @IsNumber()
  @Min(0)
  contract_fee?: number; // Contract fee amount
}



