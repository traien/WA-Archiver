import { Chat, Participant, Message, ChatAnalytics, MediaItem } from '../types';

const TOKEN_KEY = 'wa_viewer_token';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string, remember: boolean = true) {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (response.status === 401) {
    authStorage.clearToken();
    window.dispatchEvent(new Event('auth_unauthorized'));
    throw new Error('Unauthorized. Please log in.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(username: string, password: string, remember: boolean = true): Promise<{ success: boolean; token: string; username: string }> {
    const res = await request<{ success: boolean; token: string; username: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    authStorage.setToken(res.token, remember);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      authStorage.clearToken();
    }
  },

  async checkAuth(): Promise<boolean> {
    try {
      const res = await request<{ authenticated: boolean }>('/api/auth/me');
      return res.authenticated;
    } catch {
      return false;
    }
  },

  // Chats
  async getChats(): Promise<{ chats: Chat[] }> {
    return request<{ chats: Chat[] }>('/api/chats');
  },

  async getChat(id: string): Promise<{ chat: Chat; participants: Participant[] }> {
    return request<{ chat: Chat; participants: Participant[] }>(`/api/chats/${id}`);
  },

  async updateChat(id: string, data: { name?: string; type?: 'personal' | 'group' }): Promise<{ chat: Chat }> {
    return request<{ chat: Chat }>(`/api/chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteChat(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/chats/${id}`, {
      method: 'DELETE'
    });
  },

  async uploadChatZip(file: File, type?: 'personal' | 'group'): Promise<{
    success: boolean;
    chat: Chat;
    participants: Participant[];
    messageCount: number;
    mediaCount: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);
    if (type) {
      formData.append('type', type);
    }

    return request('/api/chats/upload', {
      method: 'POST',
      body: formData
    });
  },

  // Participants
  async updateParticipant(chatId: string, participantId: string, data: {
    display_name?: string;
    phone_number?: string;
    is_me?: number;
    color?: string;
    notes?: string;
  }): Promise<{ participants: Participant[] }> {
    return request<{ participants: Participant[] }>(`/api/chats/${chatId}/participants/${participantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // Messages
  async getMessages(chatId: string, params: {
    limit?: number;
    offset?: number;
    beforeTimestamp?: number;
    afterTimestamp?: number;
    aroundId?: string;
    startDate?: string;
    endDate?: string;
    senderId?: string;
    type?: string;
    search?: string;
    wholeWord?: boolean;
  } = {}): Promise<{ messages: Message[]; total: number; hasMoreBefore: boolean; hasMoreAfter: boolean }> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    if (params.beforeTimestamp !== undefined) query.set('beforeTimestamp', String(params.beforeTimestamp));
    if (params.afterTimestamp !== undefined) query.set('afterTimestamp', String(params.afterTimestamp));
    if (params.aroundId) query.set('aroundId', params.aroundId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.senderId) query.set('senderId', params.senderId);
    if (params.type) query.set('type', params.type);
    if (params.search) query.set('search', params.search);
    if (params.wholeWord) query.set('wholeWord', 'true');

    return request<{ messages: Message[]; total: number; hasMoreBefore: boolean; hasMoreAfter: boolean }>(`/api/chats/${chatId}/messages?${query.toString()}`);
  },

  async getChatDates(chatId: string): Promise<{ dates: { date: string; count: number }[] }> {
    return request<{ dates: { date: string; count: number }[] }>(`/api/chats/${chatId}/dates`);
  },

  async getChatMedia(chatId: string, category: 'images' | 'videos' | 'audio' | 'docs' | 'all' = 'all'): Promise<{ media: MediaItem[] }> {
    return request<{ media: MediaItem[] }>(`/api/chats/${chatId}/media?category=${category}`);
  },

  async getChatAnalytics(chatId: string): Promise<{ analytics: ChatAnalytics }> {
    return request<{ analytics: ChatAnalytics }>(`/api/chats/${chatId}/analytics`);
  },

  // Starred Messages
  async toggleStarMessage(chatId: string, messageId: string, isStarred: boolean): Promise<{ success: boolean; is_starred: number }> {
    return request<{ success: boolean; is_starred: number }>(`/api/chats/${chatId}/messages/${messageId}/star`, {
      method: 'POST',
      body: JSON.stringify({ is_starred: isStarred })
    });
  },

  async getStarredMessages(chatId: string): Promise<{ messages: Message[] }> {
    return request<{ messages: Message[] }>(`/api/chats/${chatId}/starred`);
  },

  // Export
  async getChatExport(chatId: string, startDate?: string, endDate?: string): Promise<{ chat: Chat; messages: Message[]; participants: Participant[] }> {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ chat: Chat; messages: Message[]; participants: Participant[] }>(`/api/chats/${chatId}/export${qs}`);
  },

  // Settings & Storage
  async applyMeIdentities(identities: string[]): Promise<{ success: boolean; updatedCount: number; totalParticipants: number }> {
    return request<{ success: boolean; updatedCount: number; totalParticipants: number }>('/api/settings/apply-me-identity', {
      method: 'POST',
      body: JSON.stringify({ identities })
    });
  },

  async getStorageStats(): Promise<{ dbPath: string; dbSize: number; mediaDir: string; mediaCount: number; mediaSize: number }> {
    return request<{ dbPath: string; dbSize: number; mediaDir: string; mediaCount: number; mediaSize: number }>('/api/settings/storage');
  }
};
