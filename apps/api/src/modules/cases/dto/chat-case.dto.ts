import { IsString, IsOptional, MinLength, MaxLength, IsUUID } from 'class-validator';

export class ChatCaseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsUUID()
  lastMessageId?: string;
}
