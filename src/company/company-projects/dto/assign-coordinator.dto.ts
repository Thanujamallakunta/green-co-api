import { IsNotEmpty, IsString } from 'class-validator';

export class AssignCoordinatorDto {
  @IsNotEmpty()
  @IsString()
  coordinator_id: string; // Coordinator master ID
}



