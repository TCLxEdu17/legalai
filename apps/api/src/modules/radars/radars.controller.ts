import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RadarsService } from './radars.service';
import { CreateRadarDto } from './dto/create-radar.dto';
import { UpdateRadarDto } from './dto/update-radar.dto';

@Controller('radars')
@UseGuards(JwtAuthGuard)
export class RadarsController {
  constructor(private readonly radarsService: RadarsService) {}

  @Post()
  create(@Body() dto: CreateRadarDto, @Request() req: any) {
    return this.radarsService.create(dto, req.user.id);
  }

  @Get()
  list(@Request() req: any) {
    return this.radarsService.list(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.radarsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRadarDto, @Request() req: any) {
    return this.radarsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.radarsService.remove(id, req.user.id);
  }
}
