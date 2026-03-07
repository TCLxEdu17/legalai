import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ICollector, CollectorConfig, CollectedItem } from './collector.interface';

@Injectable()
export class RssCollector implements ICollector {
  private readonly logger = new Logger(RssCollector.name);

  // Cache do conteúdo extraído no feed para usar em fetchItem sem nova request
  private readonly contentCache = new Map<string, { title: string; content: string; metadata: any }>();

  async discoverItems(
    config: CollectorConfig,
  ): Promise<Array<{ identifier: string; url: string; title?: string }>> {
    // rss-parser é CJS; require() funciona corretamente
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Parser = require('rss-parser');
    const parser = new Parser({
      customFields: { item: ['description', 'content:encoded', 'summary'] },
    });

    const feedUrl: string = config.configJson.feedUrl || config.baseUrl;
    const maxItems: number = config.configJson.maxItems || 30;

    try {
      this.logger.debug(`Lendo feed RSS: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);

      const items = (feed.items || []).slice(0, maxItems).filter((item: any) => item.link);

      for (const item of items) {
        const url = item.link!;
        // Extrair conteúdo disponível no próprio feed (evita request adicional)
        const rawContent: string =
          (item as any)['content:encoded'] ||
          item.content ||
          item.summary ||
          (item as any).description ||
          item.contentSnippet ||
          '';

        const cleanContent = this.stripHtml(rawContent).trim();

        if (cleanContent.length >= 100) {
          this.contentCache.set(url, {
            title: item.title || 'Sem título',
            content: cleanContent,
            metadata: {
              judgmentDate: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : undefined,
            },
          });
        }
      }

      this.logger.log(`RSS: ${items.length} itens encontrados em ${feedUrl}`);
      return items.map((item: any) => ({
        identifier: item.link!,
        url: item.link!,
        title: item.title,
      }));
    } catch (err) {
      this.logger.warn(`Erro ao processar feed RSS ${feedUrl}: ${err.message}`);
      return [];
    }
  }

  async fetchItem(url: string, config: CollectorConfig): Promise<CollectedItem> {
    // Usar conteúdo do cache (extraído do feed) se disponível
    const cached = this.contentCache.get(url);
    if (cached && cached.content.length >= 100) {
      this.contentCache.delete(url);
      return {
        externalIdentifier: url,
        sourceUrl: url,
        title: cached.title,
        content: cached.content,
        metadata: cached.metadata,
      };
    }

    // Fallback: buscar a página completa
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    const cheerio = await import('cheerio');
    const $ = cheerio.load(response.data);
    $('script, style, nav, footer, header, aside').remove();
    const title = $('h1').first().text().trim() || $('title').text().trim();
    const content = $('article, main, .content, .post-content, body').first().text().replace(/\s{2,}/g, ' ').trim();

    return {
      externalIdentifier: url,
      sourceUrl: url,
      title: title || 'Sem título',
      content,
      metadata: {},
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
