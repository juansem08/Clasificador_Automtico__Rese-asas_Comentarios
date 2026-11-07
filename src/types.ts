import type { Priority, Sentiment } from '../shared/types';

export type { Theme } from '../shared/types';

export type View = 'load' | 'results' | 'dashboard' | 'report' | 'history' | 'settings';

export interface Filters {
  search: string;
  sentimiento: Sentiment | '';
  categoria: string;
  prioridad: Priority | '';
  lowConfidence: boolean;
}

export const EMPTY_FILTERS: Filters = { search: '', sentimiento: '', categoria: '', prioridad: '', lowConfidence: false };

export type Notice = { kind: 'success' | 'error' | 'info'; text: string } | null;
