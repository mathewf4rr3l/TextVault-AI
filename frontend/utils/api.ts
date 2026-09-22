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
  copies?: number;
  avg_rating?: number;
  rating_count?: number;
  my_rating?: number;
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
  copy_streak: number;
  longest_streak: number;
  total_copies: number;
  bonus_points: number;
  streak_badge: { emoji: string; label: string };
  rank: RankInfo;
  next_rank: RankInfo | null;
  progress: number;
  points_to_next: number;
}

export interface CollectionPreview {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  count: number;
  is_following?: boolean;
  preview: Prompt[];
}

export interface CollectionDetail extends Omit<CollectionPreview, 'preview'> {
  prompts: Prompt[];
}

export interface PackageInfo {
  id: string;
  name: string;
  amount: number;
  currency: string;
  tagline: string;
  perks: string[];
}

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  picture: string;
  score: number;
  prompts_uploaded: number;
  rank: RankInfo;
}

export interface Review {
  id?: string;
  author_name: string;
  stars: number;
  review: string;
  helpful_count?: number;
  is_helpful?: boolean;
  created_at: string;
}

export interface WeeklyWarrior {
  user_id: string;
  name: string;
  picture: string;
  weekly_score: number;
  rank: RankInfo;
}

export interface StreakStatus {
  copy_streak: number;
  longest_streak: number;
  copied_today: boolean;
  at_risk: boolean;
  badge: { emoji: string; label: string };
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
  min_rating?: number;
  sort?: 'trending' | 'newest' | 'top' | 'top_rated';
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
  copyPrompt: (id: string) =>
    call<{ copies: number; streak: number; points_awarded: number; badge: { emoji: string; label: string } }>(
      `/api/prompts/${id}/copy`, { method: 'POST' }),
  ratePrompt: (id: string, stars: number, review?: string) =>
    call<{ avg_rating: number; rating_count: number; my_rating: number }>(
      `/api/prompts/${id}/rate`, { method: 'POST', body: JSON.stringify({ stars, review }) }),
  getReviews: (id: string) => call<Review[]>(`/api/prompts/${id}/reviews`),
  markHelpful: (ratingId: string) =>
    call<{ is_helpful: boolean; helpful_count: number }>(`/api/reviews/${ratingId}/helpful`, { method: 'POST' }),
  getStreak: () => call<StreakStatus>('/api/streak'),

  // Collections
  getCollections: () => call<CollectionPreview[]>('/api/collections'),
  getCollection: (id: string) => call<CollectionDetail>(`/api/collections/${id}`),
  followCollection: (id: string) =>
    call<{ is_following: boolean }>(`/api/collections/${id}/follow`, { method: 'POST' }),
  getWeeklyWarriors: () => call<WeeklyWarrior[]>('/api/weekly-warriors'),

  // Payments (infra)
  getPackages: () => call<{ enabled: boolean; packages: PackageInfo[] }>('/api/payments/packages'),
  createCheckout: (packageId: string, originUrl: string) =>
    call<{ url: string; session_id: string }>('/api/payments/checkout', {
      method: 'POST',
      body: JSON.stringify({ package_id: packageId, origin_url: originUrl }),
    }),
  getPaymentStatus: (sessionId: string) =>
    call<{ session_id: string; status: string; payment_status: string; paid: boolean }>(
      `/api/payments/status/${sessionId}`),

  // Library / profile
  getLibrary: (type: 'uploads' | 'liked' | 'following') =>
    call<Prompt[]>(`/api/library?type=${type}`),
  getProfile: () => call<Profile>('/api/profile'),
  getLeaderboard: () => call<LeaderboardEntry[]>('/api/leaderboard'),
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
