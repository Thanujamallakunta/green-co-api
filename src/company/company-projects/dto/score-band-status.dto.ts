import { IsIn } from 'class-validator';

export class ScoreBandStatusDto {
  @IsIn([0, 1], { message: 'score_band_status must be 0 or 1' })
  score_band_status: 0 | 1;
}
