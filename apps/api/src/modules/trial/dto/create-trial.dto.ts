import { IsString, IsNotEmpty, IsIn, IsEmail, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTrialDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Dr.', 'Dra.'])
  prefix: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  contactEmail?: string;

  @IsOptional()
  @IsString()
  // Aceita formatos: (11) 91234-5678 / 11912345678 / +5511912345678
  @Matches(/^(\+?55)?[\s\-]?\(?(\d{2})\)?[\s\-]?9?\d{4}[\s\-]?\d{4}$/, {
    message: 'Informe um telefone celular válido com DDD.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone?: string;
}
