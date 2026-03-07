import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ICollector, CollectorConfig, CollectedItem } from './collector.interface';

/**
 * Coletor baseado em sitemap XML.
 *
 * Configuração esperada (configJson):
 * {
 *   "sitemapUrl": "https://example.com/sitemap.xml",  // URL do sitemap (opcional, usa baseUrl se não definido)
 *   "urlFilter": "jurisprudencia",                    // string para filtrar URLs relevantes
 *   "titleSelector": "h1",
 *   "contentSelector": ".content",
 *   "maxItems": 100
 * }
 */
@Injectable()
export class SitemapCollector implements ICollector {
  private readonly logger = new Logger(SitemapCollector.name);

  async discoverItems(
    config: CollectorConfig,
  ): Promise<Array<{ identifier: string; url: string; title?: string }>> {
    const { baseUrl, configJson } = config;
    const sitemapUrl: string = configJson.sitemapUrl || `${baseUrl}/sitemap.xml`;
    const urlFilter: string | undefined = configJson.urlFilter;
    const maxItems: number = configJson.maxItems || 100;

    this.logger.debug(`Buscando sitemap: ${sitemapUrl}`);

    try {
      const response = await axios.get(sitemapUrl, {
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalAI-Bot/1.0)' },
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const urls: Array<{ identifier: string; url: string }> = [];

      $('url loc').each((_, el) => {
        const url = $(el).text().trim();
        if (!urlFilter || url.includes(urlFilter)) {
          urls.push({ identifier: url, url });
        }
      });

      const sliced = urls.slice(0, maxItems);
      this.logger.log(`Sitemap: ${sliced.length} URLs encontradas`);
      return sliced;
    } catch (err) {
      this.logger.warn(`Erro ao processar sitemap ${sitemapUrl}: ${err.message}`);
      return [];
    }
  }

  async fetchItem(url: string, config: CollectorConfig): Promise<CollectedItem> {
    const { configJson } = config;

    const response = await axios.get(url, {
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalAI-Bot/1.0)' },
    });

    const $ = cheerio.load(response.data);

    const titleSelector: string = configJson.titleSelector || 'h1';
    const contentSelector: string = configJson.contentSelector || 'article, main, body';

    const title = $(titleSelector).first().text().trim();
    const content = $(contentSelector).first().text().replace(/\s{2,}/g, ' ').trim();

    return {
      externalIdentifier: url,
      sourceUrl: url,
      title: title || 'Sem título',
      content,
      metadata: {},
    };
  }
}
