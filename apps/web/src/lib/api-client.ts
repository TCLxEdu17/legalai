import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/v1`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000, // 60s para permitir respostas RAG mais longas
    });

    // Interceptor: injetar token de acesso
    this.client.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Interceptor: refresh automático do token (com mutex para evitar race condition)
    let isRefreshing = false;
    let lastRefreshAt = 0; // timestamp do último refresh bem-sucedido
    let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

    const processQueue = (error: unknown, token: string | null) => {
      pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
      pendingQueue = [];
    };

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        // Se o token acabou de ser renovado (< 10s atrás), reusar o token do localStorage
        // em vez de tentar outro refresh — evita falha com refresh token já rotacionado
        const freshToken = localStorage.getItem('accessToken');
        if (freshToken && Date.now() - lastRefreshAt < 10_000) {
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return this.client(originalRequest);
        }

        // Se já há um refresh em andamento, enfileirar esta requisição
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            pendingQueue.push({
              resolve: (token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              },
              reject,
            });
          });
        }

        isRefreshing = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('Sem refresh token');

          const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          lastRefreshAt = Date.now();

          processQueue(null, accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return this.client(originalRequest);
        } catch (err) {
          processQueue(err, null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      },
    );
  }

  // ==================== AUTH ====================
  async login(email: string, password: string) {
    const { data } = await this.client.post('/auth/login', { email, password });
    return data;
  }

  async logout(refreshToken?: string) {
    await this.client.post('/auth/logout', { refreshToken }).catch(() => {});
  }

  async getMe() {
    const { data } = await this.client.get('/auth/me');
    return data;
  }

  // ==================== DOCUMENTS ====================
  async getDocuments(params?: {
    page?: number;
    limit?: number;
    search?: string;
    tribunal?: string;
    theme?: string;
    status?: string;
  }) {
    const { data } = await this.client.get('/documents', { params });
    return data;
  }

  async getDocument(id: string) {
    const { data } = await this.client.get(`/documents/${id}`);
    return data;
  }

  async deleteDocument(id: string) {
    await this.client.delete(`/documents/${id}`);
  }

  async generateDocumentSummary(id: string): Promise<{ summary: string }> {
    const { data } = await this.client.post(`/documents/${id}/summary`);
    return data;
  }

  async getDocumentStats() {
    const { data } = await this.client.get('/documents/stats');
    return data;
  }

  // ==================== UPLOADS ====================
  async uploadDocument(formData: FormData) {
    const { data } = await this.client.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2min para upload
    });
    return data;
  }

  async reindexDocument(id: string) {
    const { data } = await this.client.post(`/uploads/${id}/reindex`);
    return data;
  }

  // ==================== CHAT ====================
  async sendMessage(message: string, sessionId?: string, legalArea?: string) {
    const { data } = await this.client.post('/chat/message', { message, sessionId, legalArea });
    return data;
  }

  async getChatSessions() {
    const { data } = await this.client.get('/chat/sessions');
    return data;
  }

  async getSessionMessages(sessionId: string) {
    const { data } = await this.client.get(`/chat/sessions/${sessionId}`);
    return data;
  }

  async deleteSession(sessionId: string) {
    await this.client.delete(`/chat/sessions/${sessionId}`);
  }

  // ==================== USERS ====================
  async getUsers() {
    const { data } = await this.client.get('/users');
    return data;
  }

  async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) {
    const { data } = await this.client.post('/users', userData);
    return data;
  }

  async deleteAccount() {
    await this.client.delete('/users/me');
  }

  async getPlanInfo() {
    const { data } = await this.client.get('/users/me/plan');
    return data as { plan: string; limits: { chatMessages: number | null; uploads: number | null; apiCalls: number | null }; usage: { chatMessages: number; uploads: number; apiCalls: number } };
  }

  async getLegalNews() {
    const { data } = await this.client.get('/news/legal');
    return data as Array<{ title: string; link: string; summary: string; pubDate: string; source: string; category: string }>;
  }

  async getProcesso(numero: string) {
    const { data } = await this.client.get(`/processos/${encodeURIComponent(numero)}`);
    return data;
  }

  async listSavedProcesses() {
    const { data } = await this.client.get('/processos/saved/list');
    return data;
  }

  async saveProcess(payload: { number: string; title?: string; area?: string }) {
    const { data } = await this.client.post('/processos/saved', payload);
    return data;
  }

  async deleteSavedProcess(id: string) {
    const { data } = await this.client.delete(`/processos/saved/${id}`);
    return data;
  }

  // ==================== PROCESSOS PRIVADOS (PRO) ====================
  async getOabCredentialStatus(): Promise<{ configured: boolean }> {
    const { data } = await this.client.get('/private-processos/credentials/status');
    return data;
  }

  async saveOabCredentials(oabNumber: string, password: string) {
    await this.client.post('/private-processos/credentials', { oabNumber, password });
  }

  async deleteOabCredentials() {
    await this.client.delete('/private-processos/credentials');
  }

  async queryPrivateProcess(numero: string) {
    const { data } = await this.client.post('/private-processos/query', { numero });
    return data;
  }

  async listPrivateSavedProcesses() {
    const { data } = await this.client.get('/private-processos');
    return data;
  }

  async savePrivateProcess(numero: string, title?: string) {
    const { data } = await this.client.post('/private-processos', { numero, title });
    return data;
  }

  async deletePrivateProcess(numero: string) {
    await this.client.delete(`/private-processos/${encodeURIComponent(numero)}`);
  }

  async updateProfile(payload: { name?: string; prefix?: string; oabNumber?: string }) {
    const { data } = await this.client.patch('/users/profile', payload);
    return data;
  }

  async analyzeDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post('/uploads/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  }

  // ==================== SOURCES ====================
  async getSources() {
    const { data } = await this.client.get('/sources');
    return data;
  }

  async getSource(id: string) {
    const { data } = await this.client.get(`/sources/${id}`);
    return data;
  }

  async createSource(sourceData: {
    name: string;
    description?: string;
    baseUrl: string;
    sourceType: string;
    scheduleCron?: string;
    isActive?: boolean;
    configJson?: Record<string, any>;
  }) {
    const { data } = await this.client.post('/sources', sourceData);
    return data;
  }

  async updateSource(id: string, sourceData: Partial<{
    name: string;
    description: string;
    baseUrl: string;
    sourceType: string;
    scheduleCron: string;
    isActive: boolean;
    configJson: Record<string, any>;
  }>) {
    const { data } = await this.client.patch(`/sources/${id}`, sourceData);
    return data;
  }

  async deleteSource(id: string) {
    await this.client.delete(`/sources/${id}`);
  }

  async runSource(id: string) {
    const { data } = await this.client.post(`/ingestion/sources/${id}/run`);
    return data;
  }

  async getSourceJobs(sourceId: string, params?: { page?: number; limit?: number }) {
    const { data } = await this.client.get(`/sources/${sourceId}/jobs`, { params });
    return data;
  }

  // ==================== INGESTION ====================
  async getIngestionJobs(params?: { page?: number; limit?: number; sourceId?: string }) {
    const { data } = await this.client.get('/ingestion/jobs', { params });
    return data;
  }

  async getIngestionJob(id: string) {
    const { data } = await this.client.get(`/ingestion/jobs/${id}`);
    return data;
  }

  async runAllSources() {
    const { data } = await this.client.post('/ingestion/sources/run-all');
    return data;
  }

  async cleanupOrphanedJobs() {
    const { data } = await this.client.post('/ingestion/jobs/cleanup-orphans');
    return data;
  }

  // ==================== API KEYS ====================
  async getApiKeys() {
    const { data } = await this.client.get('/api-keys');
    return data;
  }

  async createApiKey(name: string) {
    const { data } = await this.client.post('/api-keys', { name });
    return data;
  }

  async deleteApiKey(id: string) {
    await this.client.delete(`/api-keys/${id}`);
  }

  // ==================== CLIENTS ====================
  async getClients(search?: string) {
    const { data } = await this.client.get('/clients', { params: { search } });
    return data;
  }

  async createClient(client: { name: string; email?: string; phone?: string; cpfCnpj?: string; address?: string; notes?: string }) {
    const { data } = await this.client.post('/clients', client);
    return data;
  }

  async updateClient(id: string, client: Partial<{ name: string; email: string; phone: string; cpfCnpj: string; address: string; notes: string; isActive: boolean }>) {
    const { data } = await this.client.patch(`/clients/${id}`, client);
    return data;
  }

  async deleteClient(id: string) {
    await this.client.delete(`/clients/${id}`);
  }

  // ==================== HEARINGS ====================
  async getHearings() {
    const { data } = await this.client.get('/hearings');
    return data;
  }

  async createHearing(hearing: { title: string; client?: string; processNumber?: string; court?: string; date: string; location?: string; notes?: string }) {
    const { data } = await this.client.post('/hearings', hearing);
    return data;
  }

  async updateHearing(id: string, hearing: Partial<{ title: string; client: string; processNumber: string; court: string; date: string; location: string; notes: string }>) {
    const { data } = await this.client.patch(`/hearings/${id}`, hearing);
    return data;
  }

  async deleteHearing(id: string) {
    await this.client.delete(`/hearings/${id}`);
  }

  // ==================== FAVORITES ====================
  async getFavorites() {
    const { data } = await this.client.get('/favorites');
    return data;
  }

  async getFavoriteIds(): Promise<string[]> {
    const { data } = await this.client.get('/favorites/ids');
    return data;
  }

  async addFavorite(documentId: string, collection?: string, note?: string) {
    const { data } = await this.client.post('/favorites', { documentId, collection, note });
    return data;
  }

  async removeFavorite(documentId: string) {
    await this.client.delete(`/favorites/${documentId}`);
  }

  // ==================== TRIAL ====================
  async createTrial(data: { prefix: string; name: string }) {
    const { data: res } = await this.client.post('/trial', data);
    return res;
  }

  async getTrialStatus(id: string) {
    const { data } = await this.client.get(`/trial/${id}`);
    return data;
  }

  async submitTrialFeedback(id: string, feedback: 'YES' | 'NO') {
    const { data } = await this.client.post(`/trial/${id}/feedback`, { feedback });
    return data;
  }

  async trackTrialMetric(
    id: string,
    payload: { event: string; page?: string; element?: string; metadata?: any },
  ) {
    const { data } = await this.client.post(`/trial/${id}/track`, payload);
    return data;
  }

  // ==================== WEBHOOKS ====================
  async getWebhooks() {
    const { data } = await this.client.get('/webhooks');
    return data as Array<{ id: string; url: string; events: string[]; isActive: boolean; secret: string; createdAt: string }>;
  }

  async createWebhook(url: string, events: string[]) {
    const { data } = await this.client.post('/webhooks', { url, events });
    return data;
  }

  async deleteWebhook(id: string) {
    await this.client.delete(`/webhooks/${id}`);
  }

  // ==================== COMMENTS ====================
  async getDocumentComments(documentId: string) {
    const { data } = await this.client.get(`/documents/${documentId}/comments`);
    return data as Array<{ id: string; content: string; createdAt: string }>;
  }

  async addDocumentComment(documentId: string, content: string) {
    const { data } = await this.client.post(`/documents/${documentId}/comments`, { content });
    return data;
  }

  async deleteDocumentComment(documentId: string, commentId: string) {
    await this.client.delete(`/documents/${documentId}/comments/${commentId}`);
  }

  // ==================== NOTIFICATIONS ====================
  async getNotifications() {
    const { data } = await this.client.get('/notifications');
    return data as Array<{ id: string; title: string; body: string; read: boolean; link?: string; createdAt: string }>;
  }

  async markNotificationRead(id: string) {
    await this.client.patch(`/notifications/${id}/read`);
  }

  async markAllNotificationsRead() {
    await this.client.patch('/notifications/read-all');
  }

  // ==================== BILLING ====================
  async createCheckoutSession(planId: string): Promise<{ url: string }> {
    const { data } = await this.client.post('/billing/checkout', { planId });
    return data;
  }

  async createPortalSession(): Promise<{ url: string }> {
    const { data } = await this.client.post('/billing/portal');
    return data;
  }

  // ==================== RAG TOOLS ====================
  async reviewPeca(text: string): Promise<{ review: string }> {
    const { data } = await this.client.post('/rag/review', { text }, { timeout: 120000 });
    return data;
  }

  async reviewPecaFile(file: File): Promise<{ review: string; extractedLength: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post('/rag/review-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  }

  async generateMinuta(template: string, fields: Record<string, string>): Promise<{ minuta: string }> {
    const { data } = await this.client.post('/rag/minuta', { template, fields }, { timeout: 120000 });
    return data;
  }

  async compareDocuments(documentIds: string[], perspective?: string): Promise<{ comparison: string; documents: any[] }> {
    const { data } = await this.client.post('/rag/compare', { documentIds, perspective }, { timeout: 120000 });
    return data;
  }

  // ==================== CASOS JURÍDICOS ====================
  async getCases() {
    const { data } = await this.client.get('/cases');
    return data;
  }

  async getCase(id: string) {
    const { data } = await this.client.get(`/cases/${id}`);
    return data;
  }

  async createCase(payload: {
    title: string;
    area?: string;
    processNumber?: string;
    court?: string;
    judge?: string;
    plaintiff?: string;
    defendant?: string;
    caseValue?: number;
    notes?: string;
  }) {
    const { data } = await this.client.post('/cases', payload);
    return data;
  }

  async updateCase(id: string, payload: Record<string, any>) {
    const { data } = await this.client.patch(`/cases/${id}`, payload);
    return data;
  }

  async deleteCase(id: string) {
    await this.client.delete(`/cases/${id}`);
  }

  async getCaseSummary(id: string) {
    const { data } = await this.client.get(`/cases/${id}/summary`, { timeout: 90000 });
    return data;
  }

  async uploadCaseDocument(caseId: string, file: File, docType?: string, title?: string) {
    const form = new FormData();
    form.append('file', file);
    const params = new URLSearchParams();
    if (docType) params.append('docType', docType);
    if (title) params.append('title', title);
    const { data } = await this.client.post(
      `/cases/${caseId}/documents?${params.toString()}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 },
    );
    return data;
  }

  async deleteCaseDocument(caseId: string, docId: string) {
    await this.client.delete(`/cases/${caseId}/documents/${docId}`);
  }

  async chatWithCase(caseId: string, message: string) {
    const { data } = await this.client.post(
      `/cases/${caseId}/chat`,
      { message },
      { timeout: 120000 },
    );
    return data;
  }

  async getCaseChatHistory(caseId: string) {
    const { data } = await this.client.get(`/cases/${caseId}/chat/history`);
    return data;
  }

  async clearCaseChatHistory(caseId: string) {
    await this.client.delete(`/cases/${caseId}/chat/history`);
  }

  async generateCasePiece(caseId: string, payload: {
    pieceType: string;
    title: string;
    instructions?: string;
    style?: string;
    customStyle?: string;
  }) {
    const { data } = await this.client.post(
      `/cases/${caseId}/pieces`,
      payload,
      { timeout: 180000 },
    );
    return data;
  }

  async getCasePiece(caseId: string, pieceId: string) {
    const { data } = await this.client.get(`/cases/${caseId}/pieces/${pieceId}`);
    return data;
  }

  async deleteCasePiece(caseId: string, pieceId: string) {
    await this.client.delete(`/cases/${caseId}/pieces/${pieceId}`);
  }

  async buildCaseNarrative(caseId: string) {
    const { data } = await this.client.post(`/cases/${caseId}/narrative`, {}, { timeout: 120000 });
    return data;
  }

  async analyzeCaseEvidence(caseId: string) {
    const { data } = await this.client.get(`/cases/${caseId}/evidence`, { timeout: 120000 });
    return data;
  }

  async detectCaseTheses(caseId: string) {
    const { data } = await this.client.get(`/cases/${caseId}/theses`, { timeout: 120000 });
    return data;
  }

  async generateHearingQuestions(caseId: string, witnessName?: string, witnessRole?: string) {
    const { data } = await this.client.post(`/cases/${caseId}/hearing`, { witnessName, witnessRole }, { timeout: 120000 });
    return data;
  }

  async analyzeCaseSettlement(caseId: string) {
    const { data } = await this.client.get(`/cases/${caseId}/settlement`, { timeout: 120000 });
    return data;
  }

  async getCasesRadar() {
    const { data } = await this.client.get('/cases/radar', { timeout: 120000 });
    return data;
  }

  async getOfficeCopilot() {
    const { data } = await this.client.get('/cases/copilot', { timeout: 120000 });
    return data;
  }

  async predictCompensation(payload: { tipo: string; estado: string; duracao?: string; detalhes?: string }) {
    const { data } = await this.client.post('/cases/predict-compensation', payload, { timeout: 60000 });
    return data;
  }

  // ==================== CONTRATOS ====================
  async gerarContrato(payload: {
    tipo: 'fixo' | 'exito' | 'misto';
    clienteNome?: string;
    advogadoNome?: string;
    objeto?: string;
    valor?: number;
    percentual?: number;
    prazo?: string;
    oabAdvogado?: string;
  }): Promise<{ contrato: string }> {
    const { data } = await this.client.post('/contratos/gerar', payload);
    return data;
  }

  // ==================== FINANCEIRO ====================
  async getFinanceiroResumo() {
    const { data } = await this.client.get('/financeiro/resumo');
    return data;
  }

  async getFinanceiroLancamentos(params?: { tipo?: string; status?: string; page?: number; limit?: number }) {
    const { data } = await this.client.get('/financeiro/lancamentos', { params });
    return data;
  }

  async createLancamento(payload: { tipo: string; valor: number; descricao: string; clienteId?: string; caseId?: string; vencimento?: string; categoria?: string }) {
    const { data } = await this.client.post('/financeiro/lancamentos', payload);
    return data;
  }

  async updateLancamento(id: string, payload: Partial<{ status: string; pagoEm: string; descricao: string; valor: number }>) {
    const { data } = await this.client.patch(`/financeiro/lancamentos/${id}`, payload);
    return data;
  }

  async deleteLancamento(id: string) {
    await this.client.delete(`/financeiro/lancamentos/${id}`);
  }

  // ==================== TAREFAS ====================
  async getTarefas(params?: { caseId?: string; status?: string; prioridade?: string; page?: number; limit?: number }) {
    const { data } = await this.client.get('/tarefas', { params });
    return data;
  }

  async getTarefasVencendo() {
    const { data } = await this.client.get('/tarefas/vencendo');
    return data;
  }

  async createTarefa(payload: { titulo: string; descricao?: string; caseId?: string; prazo?: string; prioridade?: string }) {
    const { data } = await this.client.post('/tarefas', payload);
    return data;
  }

  async updateTarefa(id: string, payload: Partial<{ titulo: string; descricao: string; prazo: string; prioridade: string; status: string; concluidaEm: string }>) {
    const { data } = await this.client.patch(`/tarefas/${id}`, payload);
    return data;
  }

  async deleteTarefa(id: string) {
    await this.client.delete(`/tarefas/${id}`);
  }

  // ==================== ANALYTICS / PREDICAO ====================
  async getPredicao(payload: { area: string; pedido: string; tribunal: string; resumoFatos?: string }): Promise<{ probabilidade: number; prazoMedio: number; fundamento?: string; pontosFavoraveis?: string[]; pontosContrarios?: string[]; jurisprudenciasRelevantes?: string[] }> {
    const { data } = await this.client.post('/analytics/predicao', payload, { timeout: 120000 });
    return data;
  }

  // ==================== PROCURACOES ====================
  async gerarProcuracao(payload: { outorgante: string; cpf?: string; rg?: string; advogado: string; oab: string; poderes: string; processoNumero?: string; foro?: string }): Promise<{ procuracao: string }> {
    const { data } = await this.client.post('/procuracoes/gerar', payload);
    return data;
  }

  async enviarProcuracaoAssinatura(payload: { email: string; conteudo: string; nomeCliente?: string }) {
    const { data } = await this.client.post('/procuracoes/enviar-assinatura', payload);
    return data;
  }

  // ==================== NOTES ====================
  async getNotes(): Promise<{ notes: string }> {
    const { data } = await this.client.get('/users/me/notes');
    return data;
  }

  async saveNotes(notes: string): Promise<{ notes: string }> {
    const { data } = await this.client.patch('/users/me/notes', { notes });
    return data;
  }

  // ==================== METRICS ====================
  async extendTrial(id: string, hours = 24) {
    const { data } = await this.client.post(`/trial/${id}/extend`, { hours });
    return data;
  }

  async convertTrial(id: string, email: string) {
    const { data } = await this.client.post(`/trial/${id}/convert`, { email });
    return data;
  }

  async getTrialMetrics() {
    const { data } = await this.client.get('/trial/admin/metrics');
    return data;
  }

  async getUsageSummary() {
    const { data } = await this.client.get('/metrics/usage');
    return data;
  }

  async getTokenUsage() {
    const { data } = await this.client.get('/metrics/tokens');
    return data;
  }
}

export const apiClient = new ApiClient();
