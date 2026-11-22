const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000/api';
/** Origine de l'API (sans /api) : sert à charger les images des gabarits. */
export const API_ORIGIN: string = API_URL.replace(/\/api\/?$/, '');
const TOKEN_KEY = 'pindrop_token';

export interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'admin' | 'customer' | 'business';
  credits: number;
}

export interface Template {
  id: number;
  key: string;
  name: string;
  category: string;
  industry: string;
  description: string | null;
  features: string[] | null;
  languages: string[] | null;
}

export interface Prospect {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  address: string;
  phone: string;
}

export interface GeoResult {
  label: string;
  lat: number;
  lon: number;
}

export interface SiteContent {
  headline: string;
  tagline: string;
  about: string;
  services: string[];
  hours: string[];
  phone: string;
  email: string;
  address: string;
  cta: string;
  photos: string[];
  colors: { primary: string; accent: string };
}

export interface PaymentLink {
  id: number;
  token: string;
  setup_cents: number;
  monthly_cents: number;
  status: 'pending' | 'paid' | 'canceled';
  payout_cents: number;
  paid_at: string | null;
}

export type SiteStatus = 'draft' | 'preview' | 'live';

export interface Site {
  id: number;
  name: string;
  slug: string;
  template_key: string;
  lang: 'fr' | 'en';
  content: SiteContent;
  status: SiteStatus;
  preview_expired: boolean;
  preview_expires_at: string | null;
  published_at: string | null;
  updated_at: string;
  public_url: string | null;
  payment_links: PaymentLink[];
  credits_left?: number;
}

export interface NewSite {
  name: string;
  template_key: string;
  lang: 'fr' | 'en';
  kind?: string;
  address?: string;
  phone?: string;
  source?: { id: string; lat: number; lon: number };
}

export interface Earnings {
  mode: string;
  commission_rate: number;
  total_paid_out_cents: number;
  monthly_recurring_cents: number;
  payments: { id: number; site_id: number; site_name: string; total_cents: number; fee_cents: number; payout_cents: number; paid_at: string }[];
}

export interface PayInfo {
  business_name: string;
  setup_cents: number;
  monthly_cents: number;
  status: 'pending' | 'paid' | 'canceled';
  mode: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* stockage indisponible : la session durera le temps de la page */
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers
      }
    });
  } catch {
    throw new ApiError(0, "Impossible de joindre le serveur. L'API est-elle démarrée ?");
  }
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body as { error?: string } | null)?.error ?? 'Erreur inattendue';
    throw new ApiError(res.status, msg);
  }
  return body as T;
}

const send = (method: string, data?: unknown): RequestInit => ({ method, body: data === undefined ? undefined : JSON.stringify(data) });

export const api = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    request<{ token: string; user: User }>('/auth/register', send('POST', data)),
  login: (data: { email: string; password: string }) => request<{ token: string; user: User }>('/auth/login', send('POST', data)),
  me: () => request<User>('/auth/me'),
  templates: () => request<Template[]>('/templates'),
  geocode: (q: string) => request<GeoResult[]>(`/geocode?q=${encodeURIComponent(q)}`),
  prospects: (lat: number, lon: number, radius: number) => request<Prospect[]>(`/prospects?lat=${lat}&lon=${lon}&radius=${radius}`),
  sites: () => request<Site[]>('/sites'),
  site: (id: number) => request<Site>(`/sites/${id}`),
  createSite: (data: NewSite) => request<Site>('/sites', send('POST', data)),
  updateSite: (id: number, data: Partial<Pick<Site, 'name' | 'template_key' | 'lang' | 'content'>>) => request<Site>(`/sites/${id}`, send('PATCH', data)),
  deleteSite: (id: number) => request<void>(`/sites/${id}`, send('DELETE')),
  publishSite: (id: number, mode: 'preview' | 'live') => request<Site>(`/sites/${id}/publish`, send('POST', { mode })),
  unpublishSite: (id: number) => request<Site>(`/sites/${id}/unpublish`, send('POST', {})),
  paymentLink: (id: number, data: { setup_amount: number; monthly_amount: number }) => request<Site>(`/sites/${id}/payment-link`, send('POST', data)),
  aiStatus: () => request<{ configured: boolean; cost: number }>('/sites/ai/status'),
  aiEdit: (id: number, instruction: string) => request<{ content: SiteContent; credits_left: number }>(`/sites/${id}/ai`, send('POST', { instruction })),
  renderPreview: (data: { name: string; template_key: string; lang: string; content: SiteContent }) =>
    request<{ url: string }>('/sites/preview', send('POST', data)),
  earnings: () => request<Earnings>('/earnings'),
  payInfo: (token: string) => request<PayInfo>(`/pay/${token}`),
  payConfirm: (token: string) => request<{ status: string }>(`/pay/${token}/confirm`, send('POST', {}))
};

export const money = (cents: number): string => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' }).format(cents / 100);

export const errorText = (e: unknown): string => (e instanceof Error ? e.message : 'Erreur inattendue');
