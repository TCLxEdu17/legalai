import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ICollector, CollectorConfig, CollectedItem } from './collector.interface';

/**
 * Coletor para páginas HTML que listam links de jurisprudências.
 *
 * Configuração esperada (configJson):
 * {
 *   "listSelector": "a.resultado-ementa",   // seletor CSS dos links na listagem
 *   "titleSelector": "h1.ementa-title",     // seletor do título na página de detalhe
 *   "contentSelector": ".ementa-body",      // seletor do conteúdo principal
 *   "processNumberSelector": ".processo",   // seletor do número do processo
 *   "tribunalSelector": ".tribunal",        // seletor do tribunal
 *   "relatorSelector": ".relator",          // seletor do relator
 *   "dateSelector": ".data-julgamento",     // seletor da data
 *   "paginationSelector": "a.proxima",      // seletor do botão de próxima página
 *   "maxPages": 5                           // máximo de páginas a coletar
 * }
 */
@Injectable()
export class HtmlListCollector implements ICollector {
  private readonly logger = new Logger(HtmlListCollector.name);

  async discoverItems(
    config: CollectorConfig,
  ): Promise<Array<{ identifier: string; url: string; title?: string }>> {
    const { baseUrl, configJson } = config;
    const listSelector: string = configJson.listSelector || 'a';
    const maxPages: number = configJson.maxPages || 3;

    const items: Array<{ identifier: string; url: string; title?: string }> = [];
    let currentUrl = baseUrl;
    let page = 0;

    while (currentUrl && page < maxPages) {
      this.logger.debug(`Descobrindo itens na página ${page + 1}: ${currentUrl}`);

      try {
        const response = await axios.get(currentUrl, {
          timeout: 30000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; LegalAI-Bot/1.0; +https://legalai.com.br/bot)',
            Accept: 'text/html,application/xhtml+xml',
          },
        });

        const $ = cheerio.load(response.data);

        $(listSelector).each((_, el) => {
          const href = $(el).attr('href');
          if (!href) return;

          const absoluteUrl = this.resolveUrl(href, currentUrl);
          const title = $(el).text().trim();

          if (absoluteUrl && !items.find((i) => i.url === absoluteUrl)) {
            items.push({ identifier: absoluteUrl, url: absoluteUrl, title: title || undefined });
          }
        });

        // Paginação
        const paginationSelector: string | undefined = configJson.paginationSelector;
        if (paginationSelector) {
          const nextHref = $(paginationSelector).first().attr('href');
          currentUrl = nextHref ? this.resolveUrl(nextHref, currentUrl) : '';
        } else {
          currentUrl = '';
        }

        page++;
      } catch (err) {
        this.logger.warn(`Erro ao descobrir itens em ${currentUrl}: ${err.message}`);
        break;
      }
    }

    this.logger.log(`Descobertos ${items.length} itens em ${baseUrl}`);
    return items;
  }

  async fetchItem(url: string, config: CollectorConfig): Promise<CollectedItem> {
    const { configJson } = config;

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LegalAI-Bot/1.0; +https://legalai.com.br/bot)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    const $ = cheerio.load(response.data);

    const title = configJson.titleSelector
      ? $(configJson.titleSelector).first().text().trim()
      : $('h1').first().text().trim() || $('title').text().trim();

    const contentSelector: string = configJson.contentSelector || 'body';
    const rawContent = $(contentSelector).text();
    const content = this.cleanText(rawContent);

    const processNumber = configJson.processNumberSelector
      ? $(configJson.processNumberSelector).first().text().trim()
      : undefined;

    const tribunal = configJson.tribunalSelector
      ? $(configJson.tribunalSelector).first().text().trim()
      : undefined;

    const relator = configJson.relatorSelector
      ? $(configJson.relatorSelector).first().text().trim()
      : undefined;

    const dateText = configJson.dateSelector
      ? $(configJson.dateSelector).first().text().trim()
      : undefined;

    return {
      externalIdentifier: url,
      sourceUrl: url,
      title: title || 'Sem título',
      content,
      metadata: {
        processNumber: processNumber || undefined,
        tribunal: tribunal || undefined,
        relator: relator || undefined,
        judgmentDate: dateText || undefined,
      },
    };
  }

  private resolveUrl(href: string, baseUrl: string): string {
    try {
      if (href.startsWith('http')) return href;
      const base = new URL(baseUrl);
      return new URL(href, base.origin).toString();
    } catch {
      return '';
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\t/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ {2,}/g, ' ')
      .trim();
  }
}
