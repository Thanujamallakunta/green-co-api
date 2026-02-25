import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** Coerce string/unknown to number for form inputs; leave undefined if empty/null. */
function toNumber(value: unknown): number | undefined {
  if (value === '' || value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

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
  @Transform(({ value }) => toNumber(value))
  fy1?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => toNumber(value))
  fy2?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => toNumber(value))
  fy3?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => toNumber(value))
  fy4?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => toNumber(value))
  fy5?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => toNumber(value))
  extrapolated?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => toNumber(value))
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
