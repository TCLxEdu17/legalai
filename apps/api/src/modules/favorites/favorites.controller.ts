import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('favorites')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar favoritos do usuário' })
  getUserFavorites(@CurrentUser('id') userId: string) {
    return this.favoritesService.getUserFavorites(userId);
  }

  @Get('ids')
  @ApiOperation({ summary: 'IDs dos documentos favoritados' })
  getFavoriteIds(@CurrentUser('id') userId: string) {
    return this.favoritesService.getFavoriteIds(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Adicionar favorito' })
  addFavorite(
    @CurrentUser('id') userId: string,
    @Body() body: { documentId: string; collection?: string; note?: string },
  ) {
    return this.favoritesService.addFavorite(userId, body.documentId, body.collection, body.note);
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover favorito' })
  removeFavorite(@CurrentUser('id') userId: string, @Param('documentId') documentId: string) {
    return this.favoritesService.removeFavorite(userId, documentId);
  }
}
