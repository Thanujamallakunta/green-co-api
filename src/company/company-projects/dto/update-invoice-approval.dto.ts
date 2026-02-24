import { IsIn, IsNumber } from 'class-validator';

/** 0=Pending, 1=Approved, 2=Rejected, 3=Under Review */
export class UpdateInvoiceApprovalDto {
  @IsNumber()
  @IsIn([0, 1, 2, 3])
  approval_status: number;
}
