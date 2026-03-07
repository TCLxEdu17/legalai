import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Confidence, ProcessingStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '—';
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '—';
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getProcessingStatusLabel(status: ProcessingStatus): string {
  const labels: Record<ProcessingStatus, string> = {
    NOT_STARTED: 'Aguardando',
    CHUNKING: 'Dividindo...',
    EMBEDDING: 'Indexando...',
    INDEXED: 'Indexado',
    FAILED: 'Erro',
  };
  return labels[status] || status;
}

export function getConfidenceLabel(confidence: Confidence): string {
  const labels: Record<Confidence, string> = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
    none: 'Sem base',
  };
  return labels[confidence] || confidence;
}

export function getConfidenceColor(confidence: Confidence): string {
  const colors: Record<Confidence, string> = {
    high: 'text-emerald-600 bg-emerald-50',
    medium: 'text-amber-600 bg-amber-50',
    low: 'text-orange-600 bg-orange-50',
    none: 'text-red-600 bg-red-50',
  };
  return colors[confidence] || 'text-gray-600 bg-gray-50';
}

export function extractApiErrorMessage(error: unknown): string {
  if (!error) return 'Erro desconhecido';

  const axiosError = error as any;
  const data = axiosError?.response?.data;

  if (data?.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : data.message;
  }

  return axiosError?.message || 'Erro ao processar requisição';
}
