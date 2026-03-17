import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as https from 'https';
import { ICollector, CollectorConfig, CollectedItem } from './collector.interface';

const httpsAgentLenient = new https.Agent({ rejectUnauthorized: false });

@Injectable()
export class RssCollector implements ICollector {
  private readonly logger = new Logger(RssCollector.name);

  // Cache do conteúdo extraído no feed para usar em fetchItem sem nova request
  private readonly contentCache = new Map<string, { title: string; content: string; metadata: any }>();

  private sanitizeXml(xml: string): string {
    let result = xml
      // & solto (não seguido de entidade válida) → &amp;
      .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/g, '&amp;')
      // Remove tags com caracteres inválidos no nome (ex: +, @, espaço) — CNJ feed
      .replace(/<\/?([a-zA-Z][^>\s/]*)([^>]*)>/g, (match, tagName) => {
        if (/[^a-zA-Z0-9_\-.:]/g.test(tagName)) return '';
        return match;
      });

    // Corrige atributos booleanos sem valor: <tag attr> → <tag attr="">
    // Bug anterior: m.includes('=') descartava o fix quando havia outros atributos com valor.
    // A regex (\s|>) garante que attr não é seguido por '=', então todo match é booleano.
    for (let i = 0; i < 3; i++) {
      const prev = result;
      result = result.replace(
        /<([^>]*)\s([a-zA-Z][a-zA-Z0-9_:-]*)(\s|>)/g,
        (_, pre, attr, suf) => `<${pre} ${attr}=""${suf}`,
      );
      if (result === prev) break;
    }

    return result;
  }

  private async fetchFeedXml(feedUrl: string): Promise<string> {
    const response = await axios.get(feedUrl, {
      timeout: 15000,
      httpsAgent: httpsAgentLenient,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegalAI-Bot/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      responseType: 'text',
    });
    return response.data as string;
  }

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
      const rawXml = await this.fetchFeedXml(feedUrl);
      const cleanedXml = this.sanitizeXml(rawXml);
      const feed = await parser.parseString(cleanedXml);

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
