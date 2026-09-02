const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface VaultEntry {
  id: string;
  content: string;
  category: string;
  tags: string[];
  confidence: number;
  metadata: Record<string, any>;
  summary?: string;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Classification {
  category: string;
  tags: string[];
  confidence: number;
  metadata: Record<string, any>;
  summary?: string;
}

async function call<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  getEntries: (params?: { category?: string; archived?: boolean; favorites?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.category && params.category !== 'All') q.append('category', params.category);
    if (params?.archived) q.append('archived', 'true');
    if (params?.favorites) q.append('favorites', 'true');
    return call<VaultEntry[]>(`/api/entries?${q}`);
  },

  getEntry: (id: string) => call<VaultEntry>(`/api/entries/${id}`),

  createEntry: (content: string, category?: string, tags?: string[]) =>
    call<VaultEntry>('/api/entries', {
      method: 'POST',
      body: JSON.stringify({ content, category, tags }),
    }),

  updateEntry: (id: string, data: Partial<VaultEntry>) =>
    call<VaultEntry>(`/api/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteEntry: (id: string) =>
    call<{ success: boolean }>(`/api/entries/${id}`, { method: 'DELETE' }),

  searchEntries: (query: string, category?: string) =>
    call<VaultEntry[]>('/api/entries/search', {
      method: 'POST',
      body: JSON.stringify({ query, category }),
    }),

  classifyText: (content: string) =>
    call<Classification>('/api/ai/classify', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  summarize: (content: string) =>
    call<{ summary: string }>('/api/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getCategoryStats: () =>
    call<{ category: string; count: number }[]>('/api/categories/stats'),

  getStats: () => call<{ total: number; favorites: number }>('/api/stats'),

  setupPin: (pin: string) =>
    call<{ success: boolean; message: string }>('/api/pin/setup', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  verifyPin: (pin: string) =>
    call<{ success: boolean; message: string }>('/api/pin/verify', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  getPinStatus: () => call<{ hasPin: boolean }>('/api/pin/status'),

  resetPin: () => call<{ success: boolean }>('/api/pin/reset', { method: 'DELETE' }),

  exportEntries: (format: string) =>
    call<{ data: any; format: string; count: number }>(`/api/export?format=${format}`),
};

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
