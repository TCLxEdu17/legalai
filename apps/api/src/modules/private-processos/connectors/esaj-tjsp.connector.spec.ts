import { EsajTjspConnector, ProcessDetails, EsajSession } from './esaj-tjsp.connector';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const MOCK_OAB = '123456/SP';
const MOCK_PASSWORD = 'SenhaOAB@123';

// HTML mínimo de resposta do e-SAJ TJSP após login bem-sucedido
const LOGIN_FORM_HTML = `
<html><body>
  <form action="/sajcas/login" method="post">
    <input type="hidden" name="_csrf" value="csrf-token-123"/>
    <input type="text" name="username"/>
    <input type="password" name="password"/>
  </form>
</body></html>
`;

const LOGIN_SUCCESS_HTML = `
<html><head><title>Portal e-SAJ</title></head>
<body><div class="barra-usuario">Bem-vindo, Advogado</div></body>
</html>
`;

const LOGIN_ERROR_HTML = `
<html><body>
  <p class="erro">Usuário ou senha incorretos.</p>
</body></html>
`;

// HTML simplificado da consulta de processo (CPOPG)
const PROCESS_HTML = `
<html><body>
  <span id="numeroProcesso">4000091-84.2025.8.26.0280</span>
  <span id="classeProcesso"><span>Procedimento Comum Cível</span></span>
  <span id="assuntoProcesso"><span>Indenização por Dano Moral</span></span>
  <span id="juizProcesso">DR. JOÃO DA SILVA</span>
  <div id="situacaoSentenca">Em andamento</div>
  <table id="tabelaTodasMovimentacoes">
    <tbody>
      <tr>
        <td class="dataMovimento">15/03/2025</td>
        <td class="descricaoMovimento">Petição juntada aos autos.</td>
      </tr>
      <tr>
        <td class="dataMovimento">10/03/2025</td>
        <td class="descricaoMovimento">Despacho. Cite-se.</td>
      </tr>
    </tbody>
  </table>
</body></html>
`;

const PROCESS_NOT_FOUND_HTML = `
<html><body>
  <div class="erro">Processo não encontrado.</div>
</body></html>
`;

describe('EsajTjspConnector', () => {
  let connector: EsajTjspConnector;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: { headers: { common: {} } },
    };
    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
    connector = new EsajTjspConnector();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('deve fazer login com sucesso e retornar sessão com cookie', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: LOGIN_FORM_HTML,
        headers: { 'set-cookie': ['JSESSIONID=abc123; Path=/'] },
      });
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: LOGIN_SUCCESS_HTML,
        headers: { 'set-cookie': ['JSESSIONID=abc123; Path=/'] },
        request: { res: { responseUrl: 'https://esaj.tjsp.jus.br/sajcas/login?goto=portal' } },
      });

      const session = await connector.login(MOCK_OAB, MOCK_PASSWORD);

      expect(session).toBeDefined();
      expect(session.cookie).toContain('JSESSIONID');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(expect.stringContaining('sajcas/login'));
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('sajcas/login'),
        expect.any(String),
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });

    it('deve lançar erro com credenciais inválidas', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: LOGIN_FORM_HTML,
        headers: { 'set-cookie': [] },
      });
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: LOGIN_ERROR_HTML,
        headers: { 'set-cookie': [] },
        request: { res: { responseUrl: 'https://esaj.tjsp.jus.br/sajcas/login' } },
      });

      await expect(connector.login(MOCK_OAB, 'senhaErrada')).rejects.toThrow(
        /credenciais inválidas|autenticação falhou/i,
      );
    });

    it('deve extrair CSRF token do formulário de login', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: LOGIN_FORM_HTML,
        headers: { 'set-cookie': [] },
      });
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: LOGIN_SUCCESS_HTML,
        headers: { 'set-cookie': ['JSESSIONID=xyz; Path=/'] },
        request: { res: { responseUrl: 'https://esaj.tjsp.jus.br/sajcas/login?goto=portal' } },
      });

      await connector.login(MOCK_OAB, MOCK_PASSWORD);

      const postBody = mockAxiosInstance.post.mock.calls[0][1] as string;
      expect(postBody).toContain('csrf-token-123');
    });
  });

  describe('queryProcess', () => {
    const mockSession: EsajSession = {
      cookie: 'JSESSIONID=abc123',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };

    it('deve consultar processo e retornar detalhes parseados', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: PROCESS_HTML });

      const details = await connector.queryProcess('4000091-84.2025.8.26.0280', mockSession);

      expect(details).toBeDefined();
      expect(details.number).toBe('4000091-84.2025.8.26.0280');
      expect(details.classe).toBe('Procedimento Comum Cível');
      expect(details.assunto).toBe('Indenização por Dano Moral');
      expect(details.juiz).toBe('DR. JOÃO DA SILVA');
      expect(details.movimentacoes).toHaveLength(2);
      expect(details.movimentacoes[0].descricao).toContain('Petição juntada');
      expect(details.movimentacoes[0].data).toBe('15/03/2025');
    });

    it('deve lançar erro quando processo não encontrado', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: PROCESS_NOT_FOUND_HTML });

      await expect(
        connector.queryProcess('0000001-00.2025.8.26.0001', mockSession),
      ).rejects.toThrow(/não encontrado/i);
    });

    it('deve incluir cookie de sessão na requisição', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: PROCESS_HTML });

      await connector.queryProcess('4000091-84.2025.8.26.0280', mockSession);

      const getCall = mockAxiosInstance.get.mock.calls[0];
      expect(getCall[1]?.headers?.Cookie).toBe('JSESSIONID=abc123');
    });

    it('deve formatar o número CNJ corretamente na URL de consulta', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: PROCESS_HTML });

      await connector.queryProcess('4000091-84.2025.8.26.0280', mockSession);

      const url = mockAxiosInstance.get.mock.calls[0][0] as string;
      expect(url).toContain('cpopg');
      // Foro 0280 deve aparecer na URL
      expect(url).toContain('280');
    });
  });

  describe('parseCnjNumber', () => {
    it('deve extrair componentes do número CNJ corretamente', () => {
      const result = connector.parseCnjNumber('4000091-84.2025.8.26.0280');
      expect(result.nnnnnnn).toBe('4000091');
      expect(result.dd).toBe('84');
      expect(result.aaaa).toBe('2025');
      expect(result.j).toBe('8');
      expect(result.tt).toBe('26');
      expect(result.oooo).toBe('0280');
    });

    it('deve lançar erro para número CNJ inválido', () => {
      expect(() => connector.parseCnjNumber('numero-invalido')).toThrow(/formato inválido/i);
    });
  });
});
