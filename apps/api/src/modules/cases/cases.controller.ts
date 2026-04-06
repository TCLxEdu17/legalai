import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { ChatCaseDto } from './dto/chat-case.dto';
import { GeneratePieceDto } from './dto/generate-piece.dto';
import { GenerateHearingDto } from './dto/generate-hearing.dto';
import { PredictCompensationDto } from './dto/predict-compensation.dto';
import { CaseDocType } from '@prisma/client';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@Controller('cases')
@UseGuards(JwtAuthGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  // ─── CASOS ────────────────────────────────────────────────────────────────

  @Post()
  createCase(@Body() dto: CreateCaseDto, @CurrentUser('id') userId: string) {
    return this.casesService.createCase(dto, userId);
  }

  @Get()
  listCases(@CurrentUser('id') userId: string) {
    return this.casesService.listCases(userId);
  }

  // ─── ROTAS SEM :id (devem vir ANTES de :id) ───────────────────────────────

  @Get('radar')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  detectOpportunities(@CurrentUser('id') userId: string) {
    return this.casesService.detectOpportunities(userId);
  }

  @Get('copilot')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  getOfficeCopilot(@CurrentUser('id') userId: string) {
    return this.casesService.getOfficeCopilot(userId);
  }

  @Post('predict-compensation')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  predictCompensation(@Body() dto: PredictCompensationDto, @CurrentUser('id') userId: string) {
    return this.casesService.predictCompensation(dto, userId);
  }

  @Get(':id')
  getCase(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.casesService.getCase(id, userId);
  }

  @Patch(':id')
  updateCase(@Param('id') id: string, @Body() dto: UpdateCaseDto, @CurrentUser('id') userId: string) {
    return this.casesService.updateCase(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCase(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.casesService.deleteCase(id, userId);
  }

  @Get(':id/summary')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  getCaseSummary(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.casesService.getCaseSummary(id, userId);
  }

  @Post(':id/narrative')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  buildLegalNarrative(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.casesService.buildLegalNarrative(id, userId);
  }

  @Get(':id/evidence')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  analyzeEvidence(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.casesService.analyzeEvidence(id, userId);
  }

  @Get(':id/theses')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  detectLegalTheses(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.casesService.detectLegalTheses(id, userId);
  }

  @Post(':id/hearing')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  generateHearingQuestions(
    @Param('id') id: string,
    @Body() dto: GenerateHearingDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.casesService.generateHearingQuestions(id, dto, userId);
  }

  @Get(':id/settlement')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  analyzeSettlement(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.casesService.analyzeSettlement(id, userId);
  }

  // ─── DOCUMENTOS ───────────────────────────────────────────────────────────

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('id') caseId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: /(pdf|docx|txt|plain|msword|wordprocessingml)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Query('docType') docType?: CaseDocType,
    @Query('title') title?: string,
  ) {
    return this.casesService.uploadDocument(caseId, userId, file, docType, title);
  }

  @Delete(':id/documents/:docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDocument(
    @Param('id') caseId: string,
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.casesService.deleteDocument(caseId, docId, userId);
  }

  // ─── CHAT ─────────────────────────────────────────────────────────────────

  @Post(':id/chat')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  chat(@Param('id') caseId: string, @Body() dto: ChatCaseDto, @CurrentUser('id') userId: string) {
    return this.casesService.chat(caseId, dto, userId);
  }

  @Get(':id/chat/history')
  getChatHistory(@Param('id') caseId: string, @CurrentUser('id') userId: string) {
    return this.casesService.getChatHistory(caseId, userId);
  }

  @Delete(':id/chat/history')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearChatHistory(@Param('id') caseId: string, @CurrentUser('id') userId: string) {
    return this.casesService.clearChatHistory(caseId, userId);
  }

  // ─── PEÇAS ────────────────────────────────────────────────────────────────

  @Post(':id/pieces')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  generatePiece(@Param('id') caseId: string, @Body() dto: GeneratePieceDto, @CurrentUser('id') userId: string) {
    return this.casesService.generatePiece(caseId, dto, userId);
  }

  @Get(':id/pieces/:pieceId')
  getPiece(
    @Param('id') caseId: string,
    @Param('pieceId') pieceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.casesService.getPiece(caseId, pieceId, userId);
  }

  @Delete(':id/pieces/:pieceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePiece(
    @Param('id') caseId: string,
    @Param('pieceId') pieceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.casesService.deletePiece(caseId, pieceId, userId);
  }
}
