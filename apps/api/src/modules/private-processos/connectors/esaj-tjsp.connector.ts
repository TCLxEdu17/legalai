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

  private extractCookies(setCookieHeaders: string[] | undefined): string {
    if (!setCookieHeaders || setCookieHeaders.length === 0) return '';
    return setCookieHeaders
      .map((c) => c.split(';')[0])
      .join('; ');
  }
}
