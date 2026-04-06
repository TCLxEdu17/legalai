import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class ChatCaseDto {
  @IsString({ message: 'A mensagem deve ser um texto' })
  @MinLength(2, { message: 'A mensagem deve ter pelo menos 2 caracteres' })
  @MaxLength(2000, { message: 'A mensagem deve ter no máximo 2000 caracteres' })
  message: string;

  @IsOptional()
  @IsUUID('4', { message: 'O ID da última mensagem deve ser um UUID válido' })
  lastMessageId?: string;
}
