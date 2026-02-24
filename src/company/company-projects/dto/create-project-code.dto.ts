import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateProjectCodeDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Project code must contain only uppercase letters, numbers, hyphens, and underscores',
  })
  project_id: string; // Project code (e.g., "PROJ-2024-001")
}



