import { IsString, IsOptional, IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateClientDto {
  @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'O nome e obrigatorio' })
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
  @MaxLength(200, { message: 'O nome deve ter no maximo 200 caracteres' })
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'O e-mail deve ser um e-mail valido' })
  @MaxLength(200, { message: 'O e-mail deve ter no maximo 200 caracteres' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'O telefone deve ser um texto' })
  @MaxLength(50, { message: 'O telefone deve ter no maximo 50 caracteres' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'O CPF/CNPJ deve ser um texto' })
  @MaxLength(20, { message: 'O CPF/CNPJ deve ter no maximo 20 caracteres' })
  cpfCnpj?: string;

  @IsOptional()
  @IsString({ message: 'O endereco deve ser um texto' })
  @MaxLength(500, { message: 'O endereco deve ter no maximo 500 caracteres' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'As observacoes devem ser um texto' })
  @MaxLength(1000, { message: 'As observacoes devem ter no maximo 1000 caracteres' })
  notes?: string;
}
