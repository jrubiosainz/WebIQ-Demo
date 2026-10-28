import type { Endpoint, SourceKind } from '../data/types';
import { ENDPOINTS } from '../data/types';
import { hostOf } from './format';

export interface LiveStatus {
  ok: boolean;
  hasKey: boolean;
  endpoints: Endpoint[];
}

export interface LiveResponse {
  status: number;
  latencyMs: number;
  data: unknown;
}

/** null si el servidor local no responde (demo servida sin `npm run live`). */
export async function getStatus(timeoutMs = 2500): Promise<LiveStatus | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/api/status', { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const j = (await res.json()) as Partial<LiveStatus>;
    if (j.ok !== true) return null;
    return { ok: true, hasKey: !!j.hasKey, endpoints: (j.endpoints ?? []).filter((e): e is Endpoint => ENDPOINTS.includes(e as Endpoint)) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function callLive(endpoint: Endpoint, body: unknown): Promise<LiveResponse> {
  const res = await fetch(`/api/webiq/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  let j: unknown = null;
  try {
    j = await res.json();
  } catch {
    /* respuesta sin JSON */
  }
  const o = (j ?? {}) as Partial<LiveResponse> & { error?: string };
  if (typeof o.status === 'number' && 'data' in o) return { status: o.status, latencyMs: Number(o.latencyMs) || 0, data: o.data };
  return { status: res.status, latencyMs: 0, data: j ?? { error: res.statusText } };
}

/** Sustituye «{client}» en todos los textos del cuerpo de un ejemplo. */
export function fillPreset<T>(body: T, client: string): T {
  if (typeof body === 'string') return body.split('{client}').join(client) as T;
  if (Array.isArray(body)) return body.map((x) => fillPreset(x, client)) as T;
  if (body && typeof body === 'object') return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, fillPreset(v, client)])) as T;
  return body;
}

export interface LiveItem {
  kind: SourceKind;
  title: string;
  url: string;
  publisher: string;
  date?: string;
  crawledAt?: string;
  language?: string;
  content?: string;
  /** Detalle propio del tipo: duración de un vídeo, tamaño de una imagen, tipo de evidencia… */
  extra?: string;
}

type R = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const arr = (v: unknown): R[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as R[]) : []);

function item(kind: SourceKind, r: R, over: Partial<LiveItem> = {}): LiveItem {
  const url = str(r.url) ?? '';
  return {
    kind,
    title: str(r.title) ?? url,
    url,
    publisher: str(r.domain) ?? (url ? hostOf(url) : ''),
    date: str(r.lastUpdatedAt),
    crawledAt: str(r.crawledAt),
    language: str(r.language),
    content: str(r.content),
    ...over,
  };
}

const EVIDENCE_KIND: Record<string, SourceKind> = {
  'media/image': 'image',
  'media/video': 'video',
  'structured/weather': 'weather',
  'structured/timeZone': 'timezone',
};

/** Convierte la respuesta de cualquier endpoint en una lista homogénea para pintarla. */
export function normalizeResults(endpoint: Endpoint, data: unknown): LiveItem[] {
  const d = (data && typeof data === 'object' ? data : {}) as R;
  switch (endpoint) {
    case 'web':
      return arr(d.webResults).map((r) => item('web', r));
    case 'news':
      return arr(d.newsResults).map((r) => item('news', r, { publisher: str(r.source) ?? str(r.domain) ?? hostOf(str(r.url) ?? '') }));
    case 'videos':
      return arr(d.videoResults).map((r) =>
        item('video', r, {
          content: str(r.description) ?? str(r.summary),
          publisher: str(r.publishedBy) ?? str(r.domain) ?? '',
          extra: [str(r.length), typeof r.viewCount === 'number' ? `${r.viewCount} views` : undefined].filter(Boolean).join(' · ') || undefined,
        }),
      );
    case 'images':
      return arr(d.imageResults).map((r) =>
        item('image', r, {
          url: str(r.hostPageUrl) ?? str(r.url) ?? '',
          // `url` es el fichero de la imagen (a menudo un CDN): el medio es la página que la publica.
          publisher: str(r.domain) ?? hostOf(str(r.hostPageUrl) ?? str(r.url) ?? ''),
          content: str(r.caption),
          extra: typeof r.width === 'number' && typeof r.height === 'number' ? `${r.width}×${r.height}` : undefined,
        }),
      );
    case 'browse':
      return str(d.url) || str(d.content) ? [item('page', d)] : [];
    case 'auto':
      return arr(d.results).map((r) => {
        const ev = (r.evidence ?? {}) as R;
        const cite = arr(r.citations)[0] ?? {};
        const type = str(ev.type) ?? 'text';
        const source = str(cite.contentSource);
        const kind: SourceKind = EVIDENCE_KIND[type] ?? (source === 'news' ? 'news' : 'web');
        const content = typeof ev.content === 'string' ? ev.content : ev.content ? JSON.stringify(ev.content) : undefined;
        return item(kind, cite, { content, extra: type });
      });
  }
}
