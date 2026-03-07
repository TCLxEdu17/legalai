import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ICollector, COLLECTOR_TYPES } from './collector.interface';
import { HtmlListCollector } from './html-list.collector';
import { SitemapCollector } from './sitemap.collector';
import { RssCollector } from './rss.collector';

@Injectable()
export class CollectorsFactory {
  private readonly logger = new Logger(CollectorsFactory.name);

  constructor(
    private readonly htmlListCollector: HtmlListCollector,
    private readonly sitemapCollector: SitemapCollector,
    private readonly rssCollector: RssCollector,
  ) {}

  getCollector(type: string): ICollector {
    switch (type) {
      case COLLECTOR_TYPES.HTML_LIST:
        return this.htmlListCollector;
      case COLLECTOR_TYPES.SITEMAP:
        return this.sitemapCollector;
      case COLLECTOR_TYPES.RSS:
        return this.rssCollector;
      default:
        this.logger.warn(`Tipo de coletor desconhecido: ${type}. Usando html-list.`);
        return this.htmlListCollector;
    }
  }
}
