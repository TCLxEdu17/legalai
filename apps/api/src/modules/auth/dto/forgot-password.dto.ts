import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;
}
