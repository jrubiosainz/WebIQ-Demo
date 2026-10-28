import { l, type BrandId, type ClientId, type L } from './types';

export interface ClientDef {
  id: BrandId;
  name: string;
  monogram: string;
  sector: L;
  /** Colores aproximados de marca: editables en Ajustes. */
  brand: { accent: string; sidebar: string; app: string; panel: string; header: string };
}

export const CLIENTS: ClientDef[] = [
  {
    id: 'iberdrola',
    name: 'Iberdrola',
    monogram: 'IB',
    sector: l('Energía', 'Energy'),
    brand: { accent: '#00A443', sidebar: '#0B3B2C', app: '#F1F6F3', panel: '#FFFFFF', header: '#FFFFFF' },
  },
  {
    id: 'barcelo',
    name: 'Barceló',
    monogram: 'BHG',
    sector: l('Hoteles y turismo', 'Hotels and travel'),
    brand: { accent: '#A9844F', sidebar: '#1C2733', app: '#F6F3EE', panel: '#FFFFFF', header: '#FFFFFF' },
  },
  {
    id: 'w2m',
    name: 'W2M',
    monogram: 'W2M',
    sector: l('Distribución turística', 'Travel distribution'),
    brand: { accent: '#6B2FA3', sidebar: '#1E1433', app: '#F5F2F9', panel: '#FFFFFF', header: '#FFFFFF' },
  },
  {
    id: 'segurcaixa',
    name: 'SegurCaixa Adeslas',
    monogram: 'SCA',
    sector: l('Seguros y salud', 'Insurance and health'),
    brand: { accent: '#0072CE', sidebar: '#002A4D', app: '#F0F5FB', panel: '#FFFFFF', header: '#FFFFFF' },
  },
  {
    id: 'cam',
    name: 'Comunidad de Madrid',
    monogram: 'CM',
    sector: l('Sector público', 'Public sector'),
    brand: { accent: '#D0202E', sidebar: '#2A2A2E', app: '#F6F4F4', panel: '#FFFFFF', header: '#FFFFFF' },
  },
  {
    id: 'custom',
    name: 'Otro cliente',
    monogram: '+',
    sector: l('Personalizado', 'Custom'),
    brand: { accent: '#0F766E', sidebar: '#10252A', app: '#F1F5F5', panel: '#FFFFFF', header: '#FFFFFF' },
  },
];

export const CLIENT_IDS: ClientId[] = ['iberdrola', 'barcelo', 'w2m', 'segurcaixa', 'cam'];

export const clientById = (id: BrandId): ClientDef => CLIENTS.find((c) => c.id === id) ?? CLIENTS[0];
