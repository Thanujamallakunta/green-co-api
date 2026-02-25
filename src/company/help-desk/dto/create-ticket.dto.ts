import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'Subject is required' })
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(1)
  @MaxLength(5000)
  description: string;
}
