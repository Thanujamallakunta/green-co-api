import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PrimaryDataFormItemDto {
  @IsOptional()
  @IsString()
  data_id?: string;

  @IsOptional()
  @IsString()
  info_type?: string;

  @IsOptional()
  @IsString()
  parameter?: string;

  @IsOptional()
  @IsString()
  reference_unit?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsNumber()
  fy1?: number;

  @IsOptional()
  @IsNumber()
  fy2?: number;

  @IsOptional()
  @IsNumber()
  fy3?: number;

  @IsOptional()
  @IsNumber()
  fy4?: number;

  @IsOptional()
  @IsNumber()
  fy5?: number;

  @IsOptional()
  @IsNumber()
  extrapolated?: number;

  @IsOptional()
  @IsNumber()
  lt_target?: number;

  @IsOptional()
  @IsString()
  additional_details?: string;
}

export class PrimaryDataStoreDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrimaryDataFormItemDto)
  doc: PrimaryDataFormItemDto[];
}
