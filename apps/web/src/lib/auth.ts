'use client';

import { apiClient } from './api-client';
import type { User, AuthTokens } from '@/types';

export async function login(email: string, password: string): Promise<AuthTokens> {
  const data = await apiClient.login(email, password);

  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken') || undefined;
  await apiClient.logout(refreshToken);

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function isAuthenticated(): boolean {
  return !!getAccessToken() && !!getStoredUser();
}

export function isAdmin(): boolean {
  const user = getStoredUser();
  return user?.role === 'ADMIN';
}
