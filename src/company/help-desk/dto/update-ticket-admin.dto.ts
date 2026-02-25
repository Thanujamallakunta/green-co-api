import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTicketAdminDto {
  @IsOptional()
  @IsIn(['open', 'in_progress', 'resolved', 'closed'], {
    message: 'status must be one of: open, in_progress, resolved, closed',
  })
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}
