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

    // Interceptor: refresh automático do token
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) throw new Error('Sem refresh token');

            const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.client(originalRequest);
          } catch {
            // Token inválido: redirecionar para login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
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
  async sendMessage(message: string, sessionId?: string) {
    const { data } = await this.client.post('/chat/message', { message, sessionId });
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

  async updateProfile(payload: { name?: string; oabNumber?: string }) {
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

  // ==================== METRICS ====================
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
