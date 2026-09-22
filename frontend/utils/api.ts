const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export interface UserType {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  is_guest?: boolean;
  created_at?: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tool?: string;
  industry?: string;
  difficulty?: string;
  use_case?: string;
  content_type?: string;
  author_id: string;
  author_name: string;
  likes: number;
  shares: number;
  is_liked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface RankInfo {
  level: number;
  name: string;
  medal: string;
  color: string;
  title?: string;
  min_score?: number;
}

export interface Category {
  name: string;
  emoji: string;
  subcategories: string[];
}

export interface Taxonomy {
  categories: Category[];
  tools: string[];
  industries: string[];
  difficulties: string[];
  content_types: string[];
  ranks: RankInfo[];
}

export interface ProfileStats {
  prompts_uploaded: number;
  likes_received: number;
  shares_received: number;
  score: number;
  rank: RankInfo;
  next_rank: RankInfo | null;
  progress: number;
  points_to_next: number;
}

export interface Profile {
  user: UserType;
  stats: ProfileStats;
}

export interface PromptFilters {
  category?: string;
  subcategory?: string;
  tool?: string;
  industry?: string;
  difficulty?: string;
  content_type?: string;
  use_case?: string;
  q?: string;
  sort?: 'trending' | 'newest' | 'top';
  limit?: number;
  skip?: number;
}

async function call<T>(path: string, opts?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const defaultHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_authToken) defaultHeaders['Authorization'] = `Bearer ${_authToken}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      signal: controller.signal,
      headers: { ...defaultHeaders, ...((opts?.headers as Record<string, string>) || {}) },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

function buildQuery(params?: Record<string, any>): string {
  const q = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'All') q.append(k, String(v));
    });
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const api = {
  // Auth
  exchangeSession: (sessionId: string) =>
    call<{ session_token: string; user: UserType }>('/api/auth/session', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }),
  createGuestSession: (deviceId: string) =>
    call<{ session_token: string; user: UserType }>('/api/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId }),
    }),
  getMe: () => call<UserType>('/api/auth/me'),
  logoutUser: () => call<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),

  // Meta
  getTaxonomy: () => call<Taxonomy>('/api/taxonomy'),

  // Prompts
  listPrompts: (filters?: PromptFilters) =>
    call<Prompt[]>(`/api/prompts${buildQuery(filters as any)}`),
  discover: () =>
    call<{ trending: Prompt[]; newest: Prompt[]; top: Prompt[]; categories: { name: string; emoji: string; count: number }[] }>(
      '/api/discover'),
  getPrompt: (id: string) => call<Prompt>(`/api/prompts/${id}`),
  createPrompt: (body: Partial<Prompt>) =>
    call<Prompt>('/api/prompts', { method: 'POST', body: JSON.stringify(body) }),
  updatePrompt: (id: string, body: Partial<Prompt>) =>
    call<Prompt>(`/api/prompts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePrompt: (id: string) =>
    call<{ success: boolean }>(`/api/prompts/${id}`, { method: 'DELETE' }),
  likePrompt: (id: string) =>
    call<{ is_liked: boolean; likes: number }>(`/api/prompts/${id}/like`, { method: 'POST' }),
  sharePrompt: (id: string) =>
    call<{ shares: number }>(`/api/prompts/${id}/share`, { method: 'POST' }),

  // Library / profile
  getLibrary: (type: 'uploads' | 'liked') =>
    call<Prompt[]>(`/api/library?type=${type}`),
  getProfile: () => call<Profile>('/api/profile'),
  getLeaderboard: () =>
    call<{ user_id: string; name: string; picture: string; score: number; prompts_uploaded: number; rank: RankInfo }[]>(
      '/api/leaderboard'),
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

export function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
