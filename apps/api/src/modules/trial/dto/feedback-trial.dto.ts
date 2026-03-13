import { IsIn } from 'class-validator';

export class FeedbackTrialDto {
  @IsIn(['YES', 'NO'])
  feedback: 'YES' | 'NO';
}
