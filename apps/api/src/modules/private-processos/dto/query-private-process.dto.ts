import { IsString, IsNotEmpty, Matches, IsOptional } from 'class-validator';

export class QueryPrivateProcessDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/, {
    message: 'numero deve estar no formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO',
  })
  numero: string;
}

export class SavePrivateProcessDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/, {
    message: 'numero deve estar no formato CNJ',
  })
  numero: string;

  @IsOptional()
  @IsString()
  title?: string;
}
