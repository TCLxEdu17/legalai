import { Injectable, Logger } from '@nestjs/common';

// rss-parser é CJS; import default quebra no build NestJS — require() resolve
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Parser = require('rss-parser');
const parser = new Parser({ timeout: 8000 });

const FEEDS = [
  { name: 'Conjur', url: 'https://www.conjur.com.br/rss/news', category: 'Geral' },
  { name: 'STF', url: 'https://portal.stf.jus.br/rss/', category: 'STF' },
  { name: 'STJ', url: 'https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/RSS.aspx', category: 'STJ' },
  { name: 'CNJ', url: 'https://www.cnj.jus.br/feed/', category: 'CNJ' },
];

export interface NewsItem {
  title: string;
  link: string;
  summary: string;
  pubDate: string;
  source: string;
  category: string;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private cache: { data: NewsItem[]; ts: number } | null = null;
  private readonly TTL = 10 * 60 * 1000; // 10 minutos

  async getLegalNews(): Promise<NewsItem[]> {
    if (this.cache && Date.now() - this.cache.ts < this.TTL) {
      return this.cache.data;
    }

    const results = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        const parsed = await parser.parseURL(feed.url);
        return parsed.items.slice(0, 6).map((item: any) => ({
          title: (item.title || '').trim(),
          link: item.link || '',
          summary: ((item.contentSnippet || item.content || '') as string)
            .replace(/<[^>]+>/g, '')
            .trim()
            .slice(0, 220),
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          source: feed.name,
          category: feed.category,
        }));
      }),
    );

    const items: NewsItem[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        items.push(...r.value);
      } else {
        this.logger.warn(`Feed ${FEEDS[i].name} falhou: ${r.reason?.message}`);
      }
    });

    items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    const data = items.slice(0, 20);
    this.cache = { data, ts: Date.now() };
    return data;
  }
}
