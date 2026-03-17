import { IsString, IsNotEmpty, Matches, MinLength } from 'class-validator';

export class SaveOabCredentialDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}\/[A-Z]{2}$/, { message: 'oabNumber deve estar no formato NNNNNN/UF (ex: 123456/SP)' })
  oabNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
