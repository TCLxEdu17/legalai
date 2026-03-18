import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

export interface EsajSession {
  cookie: string;
  expiresAt: Date;
}

export interface Movimentacao {
  data: string;
  descricao: string;
}

export interface ProcessDetails {
  number: string;
  classe: string;
  assunto: string;
  juiz: string;
  situacao: string;
  movimentacoes: Movimentacao[];
}

export interface CnjComponents {
  nnnnnnn: string;
  dd: string;
  aaaa: string;
  j: string;
  tt: string;
  oooo: string;
}

export interface ProcessSummary {
  number: string;
  classe: string;
  assunto: string;
  partes: string;
  dataAtualizacao: string;
}

export interface OabProcessList {
  processes: ProcessSummary[];
  total: number;
  page: number;
  hasMore: boolean;
}

const CNJ_REGEX = /^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})$/;
const ESAJ_BASE = 'https://esaj.tjsp.jus.br';

@Injectable()
export class EsajTjspConnector {
  private readonly logger = new Logger(EsajTjspConnector.name);
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: ESAJ_BASE,
      timeout: 20_000,
      maxRedirects: 5,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegalAI/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
  }

  parseCnjNumber(numero: string): CnjComponents {
    const match = numero.match(CNJ_REGEX);
    if (!match) throw new Error(`Número CNJ com formato inválido: ${numero}`);
    const [, nnnnnnn, dd, aaaa, j, tt, oooo] = match;
    return { nnnnnnn, dd, aaaa, j, tt, oooo };
  }

  async login(oabNumber: string, password: string): Promise<EsajSession> {
    this.logger.log(`[eSAJ] Login OAB ${oabNumber}`);

    // 1. GET login page — captura CSRF token e cookies iniciais
    const loginUrl = `${ESAJ_BASE}/sajcas/login`;
    const getResp = await this.http.get(loginUrl);
    const cookies = this.extractCookies(getResp.headers['set-cookie']);

    const $form = cheerio.load(getResp.data);
    const csrf = $form('input[name="_csrf"]').val() as string | undefined;

    // 2. POST credenciais
    const params = new URLSearchParams({
      username: oabNumber,
      password,
      ...(csrf ? { _csrf: csrf } : {}),
    });

    const postResp = await this.http.post(loginUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookies,
      },
      maxRedirects: 5,
    });

    // Detectar falha de autenticação
    const $result = cheerio.load(postResp.data);
    const errorText = $result('.erro, .error, p.erro').text().trim();
    if (errorText) {
      throw new Error(`Autenticação falhou: ${errorText}`);
    }

    const responseUrl: string = (postResp.request as any)?.res?.responseUrl ?? '';
    if (responseUrl.includes('/sajcas/login') && !responseUrl.includes('goto')) {
      throw new Error('Credenciais inválidas ou autenticação falhou');
    }

    const sessionCookies = this.extractCookies([
      ...(getResp.headers['set-cookie'] ?? []),
      ...(postResp.headers['set-cookie'] ?? []),
    ]);

    return {
      cookie: sessionCookies,
      expiresAt: new Date(Date.now() + 25 * 60 * 1000), // 25 min
    };
  }

  async queryProcess(numero: string, session: EsajSession): Promise<ProcessDetails> {
    const { oooo } = this.parseCnjNumber(numero);
    const foro = parseInt(oooo, 10).toString();

    // Codifica número para URL: remove traços e pontos
    const processoRaw = numero.replace(/[.\-]/g, '');
    const url = `${ESAJ_BASE}/cpopg/show.do?processo.numero=${encodeURIComponent(numero)}&processo.foro=${foro}&dadosConsulta.localPesquisa.cdLocal=${foro}&dadosConsulta.uuidCaptcha=&dadosConsulta.tipoNuProcesso=UNIFICADO`;

    this.logger.log(`[eSAJ] Consulta processo ${numero} foro ${foro}`);

    const resp = await this.http.get(url, {
      headers: { Cookie: session.cookie },
    });

    const $ = cheerio.load(resp.data);

    // Detectar processo não encontrado
    const erroDiv = $('.erro, .alert-danger').text().trim();
    if (erroDiv.toLowerCase().includes('não encontrado') || erroDiv.toLowerCase().includes('nao encontrado')) {
      throw new Error(`Processo não encontrado: ${numero}`);
    }

    const numeroDisplay = $('#numeroProcesso').text().trim() || numero;
    const classe = $('#classeProcesso span').first().text().trim();
    const assunto = $('#assuntoProcesso span').first().text().trim();
    const juiz = $('#juizProcesso').text().trim();
    const situacao = $('#situacaoSentenca').text().trim();

    const movimentacoes: Movimentacao[] = [];
    $('#tabelaTodasMovimentacoes tbody tr').each((_, row) => {
      const data = $(row).find('.dataMovimento').text().trim();
      const descricao = $(row).find('.descricaoMovimento').text().trim();
      if (data || descricao) {
        movimentacoes.push({ data, descricao });
      }
    });

    if (!classe && !assunto && movimentacoes.length === 0) {
      throw new Error(`Processo não encontrado: ${numero}`);
    }

    return { number: numeroDisplay || numero, classe, assunto, juiz, situacao, movimentacoes };
  }

  async listProcessesByOab(oabNumber: string, session: EsajSession, page = 0): Promise<OabProcessList> {
    // eSAJ TJSP search by OAB number — CPOPG (1ª instância)
    const params = new URLSearchParams({
      conversationId: '',
      cbPesquisa: 'NUMOAB',
      'dadosConsulta.valorConsultaNuOAB': oabNumber,
      'dadosConsulta.tipoNuProcesso': 'UNIFICADO',
      paginaConsulta: page.toString(),
    });

    const url = `${ESAJ_BASE}/cpopg/search.do?${params.toString()}`;
    this.logger.log(`[eSAJ] Listar processos OAB ${oabNumber} página ${page}`);

    const resp = await this.http.get(url, {
      headers: { Cookie: session.cookie },
    });

    const $ = cheerio.load(resp.data);

    // Detectar redirecionamento para login
    const pageTitle = $('title').text().toLowerCase();
    if (pageTitle.includes('login') || pageTitle.includes('autenticação')) {
      throw new Error('Sessão eSAJ expirada — faça login novamente');
    }

    const processes: ProcessSummary[] = [];

    // eSAJ tabela de resultados — linhas ímpares são dados, pares são detalhes expandidos
    $('table.resultTable tr.fundoClaro, table.resultTable tr.fundoEscuro').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const number = $(cells[0]).find('a').text().trim() || $(cells[0]).text().trim();
      const classe = $(cells[1]).text().trim();
      const assunto = $(cells[2]).text().trim();
      const partes = $(cells[3])?.text().trim() ?? '';
      const dataAtualizacao = $(cells[4])?.text().trim() ?? '';

      if (number) {
        processes.push({ number, classe, assunto, partes, dataAtualizacao });
      }
    });

    // Fallback: tabela genérica se a acima não encontrou nada
    if (processes.length === 0) {
      $('tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) return;
        const number = $(cells[0]).find('a').text().trim() || $(cells[0]).text().trim();
        if (number && /\d{7}-\d{2}\.\d{4}/.test(number)) {
          processes.push({
            number,
            classe: $(cells[1]).text().trim(),
            assunto: $(cells[2])?.text().trim() ?? '',
            partes: $(cells[3])?.text().trim() ?? '',
            dataAtualizacao: $(cells[4])?.text().trim() ?? '',
          });
        }
      });
    }

    // Total de resultados (texto tipo "Resultado: 1 a 25 de 142 processos")
    const totalText = $('td.resultadoTexto, .resultadoTexto').text();
    const totalMatch = totalText.match(/de\s+(\d+)/i);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : processes.length;

    const hasNextPage = $('a[title="Próxima página"], a.next').length > 0;

    return { processes, total, page, hasMore: hasNextPage };
  }

  private extractCookies(setCookieHeaders: string[] | undefined): string {
    if (!setCookieHeaders || setCookieHeaders.length === 0) return '';
    return setCookieHeaders
      .map((c) => c.split(';')[0])
      .join('; ');
  }
}
