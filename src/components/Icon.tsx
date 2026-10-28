import {
  Clapperboard,
  Clock,
  CloudRain,
  CloudSun,
  FileSearch,
  FileText,
  Globe,
  Image as ImageIcon,
  Info,
  Landmark,
  Megaphone,
  Newspaper,
  Plane,
  ShieldCheck,
  Sparkles,
  Tags,
  TrainFront,
  TriangleAlert,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { Endpoint, SourceKind } from '../data/types';

const ICONS: Record<string, LucideIcon> = {
  Clapperboard,
  Clock,
  CloudRain,
  CloudSun,
  Globe,
  Info,
  Landmark,
  Megaphone,
  Newspaper,
  Plane,
  ShieldCheck,
  Tags,
  TrainFront,
  TriangleAlert,
};

/** Nombres de icono válidos para `Scenario.icon` (los valida integrity.test.ts). */
export const ICON_NAMES: string[] = Object.keys(ICONS);

export function ScenarioIcon({ name, size = 18 }: { name: string; size?: number }) {
  const C = ICONS[name] ?? Info;
  return <C size={size} strokeWidth={1.9} aria-hidden="true" />;
}

export const ENDPOINT_ICON: Record<Endpoint, LucideIcon> = {
  web: Globe,
  news: Newspaper,
  images: ImageIcon,
  videos: Video,
  browse: FileSearch,
  auto: Sparkles,
};

export const KIND_ICON: Record<SourceKind, LucideIcon> = {
  web: Globe,
  news: Newspaper,
  image: ImageIcon,
  video: Video,
  page: FileText,
  weather: CloudSun,
  timezone: Clock,
};

export function EndpointIcon({ endpoint, size = 14 }: { endpoint: Endpoint; size?: number }) {
  const C = ENDPOINT_ICON[endpoint];
  return <C size={size} strokeWidth={2} aria-hidden="true" />;
}

export function SourceKindIcon({ kind, size = 14 }: { kind: SourceKind; size?: number }) {
  const C = KIND_ICON[kind];
  return <C size={size} strokeWidth={2} aria-hidden="true" />;
}

/** Etiqueta de endpoint con su color: web, news, images, videos, browse, auto. */
export function EndpointBadge({ endpoint, small = false }: { endpoint: Endpoint; small?: boolean }) {
  return (
    <span className={`ep ep-${endpoint}${small ? ' sm' : ''}`}>
      <EndpointIcon endpoint={endpoint} size={small ? 11 : 13} />
      {endpoint}
    </span>
  );
}
