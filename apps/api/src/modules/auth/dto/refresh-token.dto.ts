import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'O token de refresh' })
  @IsString({ message: 'O refresh token deve ser um texto' })
  @IsNotEmpty({ message: 'O refresh token é obrigatório' })
  @MinLength(10, { message: 'O refresh token é inválido' })
  refreshToken: string;
}
