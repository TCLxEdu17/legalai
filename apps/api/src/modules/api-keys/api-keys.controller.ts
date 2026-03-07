import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova API Key' })
  create(@Body() dto: CreateApiKeyDto, @CurrentUser() user: any) {
    return this.apiKeysService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar suas API Keys' })
  findAll(@CurrentUser() user: any) {
    return this.apiKeysService.findAll(user.id, user.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar API Key' })
  @ApiParam({ name: 'id', type: String })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.apiKeysService.delete(id, user.id, user.role);
  }
}
