import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivateProcessosService } from './private-processos.service';
import { OabCredentialsService } from './oab-credentials.service';
import { SaveOabCredentialDto } from './dto/save-oab-credential.dto';
import { QueryPrivateProcessDto, SavePrivateProcessDto } from './dto/query-private-process.dto';

@UseGuards(JwtAuthGuard)
@Controller('private-processos')
export class PrivateProcessosController {
  constructor(
    private readonly privateProcessosService: PrivateProcessosService,
    private readonly oabCredentialsService: OabCredentialsService,
  ) {}

  // ── OAB Credentials ──────────────────────────────────────────────

  @Post('credentials')
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveCredentials(@Request() req: any, @Body() dto: SaveOabCredentialDto) {
    await this.oabCredentialsService.saveCredentials(req.user.id, dto.oabNumber, dto.password);
  }

  @Get('credentials/status')
  async getCredentialsStatus(@Request() req: any) {
    const has = await this.oabCredentialsService.hasCredentials(req.user.id);
    return { configured: has };
  }

  @Delete('credentials')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCredentials(@Request() req: any) {
    await this.oabCredentialsService.deleteCredentials(req.user.id);
  }

  // ── Process Query ─────────────────────────────────────────────────

  @Post('query')
  async queryProcess(@Request() req: any, @Body() dto: QueryPrivateProcessDto) {
    return this.privateProcessosService.queryPrivateProcess(req.user.id, dto.numero);
  }

  // ── Saved Processes (monitoring) ──────────────────────────────────

  @Get()
  async listSaved(@Request() req: any) {
    return this.privateProcessosService.listSavedPrivateProcesses(req.user.id);
  }

  @Post()
  async saveProcess(@Request() req: any, @Body() dto: SavePrivateProcessDto) {
    return this.privateProcessosService.savePrivateProcess(req.user.id, dto.numero, dto.title);
  }

  @Delete(':numero')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeProcess(@Request() req: any, @Param('numero') numero: string) {
    await this.privateProcessosService.removeSavedProcess(req.user.id, numero);
  }
}
