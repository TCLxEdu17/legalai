import { Module } from '@nestjs/common';
import { HtmlListCollector } from './html-list.collector';
import { SitemapCollector } from './sitemap.collector';
import { RssCollector } from './rss.collector';
import { CollectorsFactory } from './collectors.factory';

@Module({
  providers: [HtmlListCollector, SitemapCollector, RssCollector, CollectorsFactory],
  exports: [CollectorsFactory],
})
export class CollectorsModule {}
