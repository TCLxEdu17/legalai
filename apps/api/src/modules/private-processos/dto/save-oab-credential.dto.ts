import { IsString, IsNotEmpty, Matches, MinLength } from 'class-validator';

export class SaveOabCredentialDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}\/[A-Z]{2}$/, { message: 'oabNumber deve estar no formato NNNNNN/UF (ex: 123456/SP)' })
  oabNumber: string;

  @IsString({ message: 'A senha deve ser um texto' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  password: string;
}
