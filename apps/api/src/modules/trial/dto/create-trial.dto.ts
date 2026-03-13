import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateTrialDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Dr.', 'Dra.'])
  prefix: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
