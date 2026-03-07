// ============================================================
// TIPOS COMPARTILHADOS FRONTEND
// ============================================================

export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export type ProcessingStatus =
  | 'NOT_STARTED'
  | 'CHUNKING'
  | 'EMBEDDING'
  | 'INDEXED'
  | 'FAILED';

export type UploadStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface JurisprudenceDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  tribunal: string | null;
  processNumber: string | null;
  relator: string | null;
  judgmentDate: string | null;
  theme: string | null;
  keywords: string[];
  uploadStatus: UploadStatus;
  processingStatus: ProcessingStatus;
  processingError: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SourceExcerpt {
  content: string;
  similarity: number;
  chunkIndex: number;
}

export interface SourceReference {
  documentId: string;
  title: string;
  tribunal: string | null;
  processNumber: string | null;
  relator: string | null;
  judgmentDate: string | null;
  theme: string | null;
  excerpts: SourceExcerpt[];
}

export type Confidence = 'high' | 'medium' | 'low' | 'none';

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: SourceReference[];
  metadata?: {
    confidence?: Confidence;
    retrievedChunks?: number;
    tokensUsed?: { input: number; output: number };
    model?: string;
  };
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
}

export interface DocumentStats {
  totalDocuments: number;
  totalChunks: number;
  byStatus: Record<string, number>;
  topTribunais: Array<{ tribunal: string; count: number }>;
}
