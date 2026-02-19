import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class RegistrationInfoDto {
  @IsOptional()
  @IsString()
  industry_id?: string;

  @IsOptional()
  @IsString()
  entity_id?: string;

  @IsOptional()
  @IsString()
  sector_id?: string;

  @IsOptional()
  @IsString()
  state_id?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  plant_address?: string;

  @IsOptional()
  @IsString()
  plant_pincode?: string;

  @IsOptional()
  @IsString()
  billing_address?: string;

  @IsOptional()
  @IsString()
  billing_pincode?: string;

  @IsOptional()
  @IsBoolean()
  is_sez?: boolean;

  @IsOptional()
  @IsString()
  turnover?: string;

  @IsOptional()
  @IsString()
  employees_count?: string;

  @IsOptional()
  @IsString()
  plant_head_name?: string;

  @IsOptional()
  @IsString()
  plant_head_designation?: string;

  @IsOptional()
  @IsString()
  plant_head_email?: string;

  @IsOptional()
  @IsString()
  plant_head_mobile?: string;
}


