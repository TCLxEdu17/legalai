import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async addFavorite(userId: string, documentId: string, collection = 'Favoritos', note?: string) {
    try {
      return await this.prisma.favorite.create({
        data: { userId, documentId, collection, note },
        include: { document: { select: { id: true, title: true, tribunal: true } } },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException('Documento já favoritado');
      throw err;
    }
  }

  async removeFavorite(userId: string, documentId: string) {
    const fav = await this.prisma.favorite.findUnique({
      where: { userId_documentId: { userId, documentId } },
    });
    if (!fav) throw new NotFoundException('Favorito não encontrado');
    await this.prisma.favorite.delete({ where: { userId_documentId: { userId, documentId } } });
  }

  async getUserFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: { document: { select: { id: true, title: true, tribunal: true, theme: true, judgmentDate: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Group by collection
    const grouped: Record<string, typeof favorites> = {};
    for (const fav of favorites) {
      if (!grouped[fav.collection]) grouped[fav.collection] = [];
      grouped[fav.collection].push(fav);
    }

    return { favorites, grouped };
  }

  async getFavoriteIds(userId: string): Promise<string[]> {
    const favs = await this.prisma.favorite.findMany({
      where: { userId },
      select: { documentId: true },
    });
    return favs.map((f) => f.documentId);
  }
}
