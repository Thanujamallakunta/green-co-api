import { IsIn, IsNotEmpty, IsString, Matches, ValidateIf } from 'class-validator';

export class SubmitPaymentDto {
  @IsIn(['Online', 'Offline'])
  payment_type: 'Online' | 'Offline';

  /** Required when payment_type is 'Offline'. No leading/trailing/double spaces. */
  @ValidateIf((o) => o.payment_type === 'Offline')
  @IsNotEmpty({ message: 'Transaction ID is required when payment mode is Offline' })
  @IsString()
  @Matches(/^\S(?!.*\s{2,}).*\S$|^\S+$/, {
    message: 'Transaction ID cannot have leading/trailing spaces or double spaces',
  })
  trans_id?: string;
}
