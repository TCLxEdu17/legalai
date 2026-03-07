export interface CollectedItem {
  externalIdentifier: string;
  sourceUrl: string;
  title: string;
  content: string;
  metadata: {
    tribunal?: string;
    processNumber?: string;
    relator?: string;
    judgmentDate?: string;
    theme?: string;
    keywords?: string[];
    [key: string]: any;
  };
}

export interface CollectorConfig {
  baseUrl: string;
  configJson: Record<string, any>;
}

export interface ICollector {
  /**
   * Retorna os identificadores de itens disponíveis na fonte
   * (URLs, IDs externos, etc.) para que o serviço possa
   * filtrar duplicados antes de baixar o conteúdo.
   */
  discoverItems(config: CollectorConfig): Promise<Array<{ identifier: string; url: string; title?: string }>>;

  /**
   * Extrai o conteúdo completo de um item já descoberto.
   */
  fetchItem(url: string, config: CollectorConfig): Promise<CollectedItem>;
}

export const COLLECTOR_TYPES = {
  HTML_LIST: 'html-list',
  SITEMAP: 'sitemap',
  RSS: 'rss',
  CUSTOM: 'custom',
} as const;

export type CollectorType = (typeof COLLECTOR_TYPES)[keyof typeof COLLECTOR_TYPES];
