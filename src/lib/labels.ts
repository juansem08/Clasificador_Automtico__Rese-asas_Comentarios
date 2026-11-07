import type { Impact, Priority, Sentiment } from '../../shared/types';

/** Sentimiento: estilo de la etiqueta (chip) y color de las marcas en gráficos. Los textos están en i18n. */
export const SENTIMENT_STYLE: Record<Sentiment, { chip: string; color: string }> = {
  Positivo: { chip: 'bg-pos-soft text-pos-ink', color: 'rgb(var(--pos))' },
  Negativo: { chip: 'bg-neg-soft text-neg-ink', color: 'rgb(var(--neg))' },
  Neutro: { chip: 'bg-neu-soft text-neu-ink', color: 'rgb(var(--neu))' },
};

/** Prioridad: la urgencia se lee por el texto; el relleno la refuerza. */
export const PRIORITY_STYLE: Record<Priority, string> = {
  Alta: 'bg-alta text-alta-ink',
  Media: 'border border-warn-line bg-warn-soft text-warn-ink',
  Baja: 'border border-line-strong text-ink-2',
};

export const IMPACT_STYLE: Record<Impact, string> = {
  Alto: 'bg-accent text-on-accent',
  Medio: 'border border-warn-line bg-warn-soft text-warn-ink',
  Bajo: 'border border-line-strong text-ink-2',
};

/** Colores en hex para el PDF (siempre en tema claro). */
export const SENTIMENT_HEX: Record<Sentiment, string> = { Positivo: '#d4924a', Negativo: '#9a4a06', Neutro: '#8a827c' };
