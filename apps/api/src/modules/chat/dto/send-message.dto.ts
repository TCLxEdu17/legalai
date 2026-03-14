import { IsString, IsNotEmpty, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Pergunta jurídica', minLength: 10 })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'A pergunta deve ter pelo menos 10 caracteres' })
  @MaxLength(2000, { message: 'A pergunta não pode ter mais de 2000 caracteres' })
  message: string;

  @ApiProperty({ required: false, description: 'ID de sessão existente para continuar conversa' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({ required: false, description: 'Área jurídica de especialização do assistente (ex: Civil, Penal, Trabalhista). Default: Generalista.' })
  @IsOptional()
  @IsString()
  legalArea?: string;
}
