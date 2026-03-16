import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  createCase(@Body() dto: CreateCaseDto, @Request() req: any) {
    return this.casesService.createCase(dto, req.user.id);
  }

  @Get()
  listCases(@Request() req: any) {
    return this.casesService.listCases(req.user.id);
  }

  // ─── ROTAS SEM :id (devem vir ANTES de :id) ───────────────────────────────

  @Get('radar')
  detectOpportunities(@Request() req: any) {
    return this.casesService.detectOpportunities(req.user.id);
  }

  @Get('copilot')
  getOfficeCopilot(@Request() req: any) {
    return this.casesService.getOfficeCopilot(req.user.id);
  }

  @Post('predict-compensation')
  predictCompensation(@Body() dto: PredictCompensationDto) {
    return this.casesService.predictCompensation(dto);
  }

  @Get(':id')
  getCase(@Param('id') id: string, @Request() req: any) {
    return this.casesService.getCase(id, req.user.id);
  }

  @Patch(':id')
  updateCase(@Param('id') id: string, @Body() dto: UpdateCaseDto, @Request() req: any) {
    return this.casesService.updateCase(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCase(@Param('id') id: string, @Request() req: any) {
    return this.casesService.deleteCase(id, req.user.id);
  }

  @Get(':id/summary')
  getCaseSummary(@Param('id') id: string, @Request() req: any) {
    return this.casesService.getCaseSummary(id, req.user.id);
  }

  @Post(':id/narrative')
  buildLegalNarrative(@Param('id') id: string, @Request() req: any) {
    return this.casesService.buildLegalNarrative(id, req.user.id);
  }

  @Get(':id/evidence')
  analyzeEvidence(@Param('id') id: string, @Request() req: any) {
    return this.casesService.analyzeEvidence(id, req.user.id);
  }

  @Get(':id/theses')
  detectLegalTheses(@Param('id') id: string, @Request() req: any) {
    return this.casesService.detectLegalTheses(id, req.user.id);
  }

  @Post(':id/hearing')
  generateHearingQuestions(
    @Param('id') id: string,
    @Body() dto: GenerateHearingDto,
    @Request() req: any,
  ) {
    return this.casesService.generateHearingQuestions(id, dto, req.user.id);
  }

  @Get(':id/settlement')
  analyzeSettlement(@Param('id') id: string, @Request() req: any) {
    return this.casesService.analyzeSettlement(id, req.user.id);
  }

  // ─── DOCUMENTOS ───────────────────────────────────────────────────────────

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('id') caseId: string,
    @Request() req: any,
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
    return this.casesService.uploadDocument(caseId, req.user.id, file, docType, title);
  }

  @Delete(':id/documents/:docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDocument(
    @Param('id') caseId: string,
    @Param('docId') docId: string,
    @Request() req: any,
  ) {
    return this.casesService.deleteDocument(caseId, docId, req.user.id);
  }

  // ─── CHAT ─────────────────────────────────────────────────────────────────

  @Post(':id/chat')
  chat(@Param('id') caseId: string, @Body() dto: ChatCaseDto, @Request() req: any) {
    return this.casesService.chat(caseId, dto, req.user.id);
  }

  @Get(':id/chat/history')
  getChatHistory(@Param('id') caseId: string, @Request() req: any) {
    return this.casesService.getChatHistory(caseId, req.user.id);
  }

  @Delete(':id/chat/history')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearChatHistory(@Param('id') caseId: string, @Request() req: any) {
    return this.casesService.clearChatHistory(caseId, req.user.id);
  }

  // ─── PEÇAS ────────────────────────────────────────────────────────────────

  @Post(':id/pieces')
  generatePiece(@Param('id') caseId: string, @Body() dto: GeneratePieceDto, @Request() req: any) {
    return this.casesService.generatePiece(caseId, dto, req.user.id);
  }

  @Get(':id/pieces/:pieceId')
  getPiece(
    @Param('id') caseId: string,
    @Param('pieceId') pieceId: string,
    @Request() req: any,
  ) {
    return this.casesService.getPiece(caseId, pieceId, req.user.id);
  }

  @Delete(':id/pieces/:pieceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePiece(
    @Param('id') caseId: string,
    @Param('pieceId') pieceId: string,
    @Request() req: any,
  ) {
    return this.casesService.deletePiece(caseId, pieceId, req.user.id);
  }
}
