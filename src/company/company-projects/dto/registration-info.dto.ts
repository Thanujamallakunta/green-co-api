import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrationInfoDto {
  // Dropdown selections (IDs)
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

  // Address fields
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

  // Company details
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
  permanent_employees?: string;

  @IsOptional()
  @IsString()
  contract_employees?: string;

  @IsOptional()
  @IsString()
  total_area?: string;

  // Plant head details
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

  // Tax and registration numbers (supporting both naming conventions)
  @IsOptional()
  @IsString()
  pan_number?: string;

  @IsOptional()
  @IsString()
  pan_no?: string; // Alternative field name from frontend

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  gstin_no?: string; // Alternative field name from frontend

  @IsOptional()
  @IsString()
  tan_no?: string;

  @IsOptional()
  @IsString()
  cin_number?: string;

  @IsOptional()
  @IsString()
  registration_number?: string;

  // Additional company info
  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  products_services?: string;

  // Contact person details
  @IsOptional()
  @IsString()
  contact_person_name?: string;

  @IsOptional()
  @IsString()
  contact_person_email?: string;

  @IsOptional()
  @IsString()
  contact_person_mobile?: string;
}


