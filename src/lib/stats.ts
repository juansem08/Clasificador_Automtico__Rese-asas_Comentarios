import { FALLBACK_CATEGORY, PRIORITIES, SENTIMENTS, type Priority, type Row, type Sentiment } from '../../shared/types';
import { isClassified, LOW_CONFIDENCE } from './data';
import { nextPeriod, periodKey, periodLabel, type Granularity } from './dates';

export type SentimentCounts = Record<Sentiment, number>;

const emptyCounts = (): SentimentCounts => ({ Positivo: 0, Negativo: 0, Neutro: 0 });

/** Confianza baja y nadie la ha revisado ni corregido todavía. */
export const needsReview = (r: Row) =>
  typeof r.confianza === 'number' && r.confianza < LOW_CONFIDENCE && !r.edited && !r.reviewed;
export const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

export interface CategoryStat {
  name: string;
  counts: SentimentCounts;
  total: number;
}

export interface Stats {
  total: number;
  classified: number;
  pending: number;
  errors: number;
  duplicates: number;
  empty: number;
  sentiment: SentimentCounts;
  categories: CategoryStat[];
  priority: Record<Priority, number>;
  lowConfidence: number;
  avgConfidence: number;
  /** % positivas − % negativas (−100 a 100) */
  net: number;
  topProblem: { name: string; count: number } | null;
}

export function computeStats(rows: Row[], categoryNames: string[]): Stats {
  const done = rows.filter(isClassified);
  const sentiment = emptyCounts();
  const priority = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<Priority, number>;
  const byCat = new Map<string, SentimentCounts>();
  for (const name of [...categoryNames, FALLBACK_CATEGORY]) byCat.set(name, emptyCounts());

  let confSum = 0;
  let confN = 0;
  let low = 0;
  for (const r of done) {
    sentiment[r.sentimiento!]++;
    if (r.prioridad) priority[r.prioridad]++;
    const cat = r.categoria!;
    if (!byCat.has(cat)) byCat.set(cat, emptyCounts());
    byCat.get(cat)![r.sentimiento!]++;
    if (typeof r.confianza === 'number') {
      confSum += r.confianza;
      confN++;
      if (needsReview(r)) low++;
    }
  }

  const categories = [...byCat.entries()]
    .map(([name, counts]) => ({ name, counts, total: counts.Positivo + counts.Negativo + counts.Neutro }))
    .filter((c) => c.total > 0 || (c.name !== FALLBACK_CATEGORY && categoryNames.includes(c.name)))
    .sort((a, b) => b.total - a.total);

  const worst = [...categories].sort((a, b) => b.counts.Negativo - a.counts.Negativo)[0];

  return {
    total: rows.length,
    classified: done.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    errors: rows.filter((r) => r.status === 'error').length,
    duplicates: rows.filter((r) => r.status === 'duplicate').length,
    empty: rows.filter((r) => r.status === 'skipped').length,
    sentiment,
    categories,
    priority,
    lowConfidence: low,
    avgConfidence: confN ? Math.round(confSum / confN) : 0,
    net: pct(sentiment.Positivo, done.length) - pct(sentiment.Negativo, done.length),
    topProblem: worst && worst.counts.Negativo > 0 ? { name: worst.name, count: worst.counts.Negativo } : null,
  };
}

export interface TrendPoint {
  key: string;
  label: string;
  counts: SentimentCounts;
  total: number;
}

export function computeTrend(rows: Row[], granularity: Granularity): TrendPoint[] {
  const dated = rows.filter((r) => r.date && isClassified(r));
  if (dated.length === 0) return [];
  const map = new Map<string, SentimentCounts>();
  for (const r of dated) {
    const key = periodKey(r.date!, granularity);
    if (!map.has(key)) map.set(key, emptyCounts());
    map.get(key)![r.sentimiento!]++;
  }
  const keys = [...map.keys()].sort();
  const points: TrendPoint[] = [];
  // Rellena los periodos sin datos para no deformar el eje del tiempo
  for (let k = keys[0]; k <= keys[keys.length - 1] && points.length < 156; k = nextPeriod(k, granularity)) {
    const counts = map.get(k) ?? emptyCounts();
    points.push({ key: k, label: periodLabel(k, granularity), counts, total: SENTIMENTS.reduce((a, s) => a + counts[s], 0) });
  }
  return points;
}

/** Semanas si el rango es corto (≤ 4 meses); meses si es largo. */
export function defaultGranularity(rows: Row[]): Granularity {
  const dates = rows.map((r) => r.date).filter(Boolean).sort() as string[];
  if (dates.length < 2) return 'month';
  const days = (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86400000;
  return days <= 120 ? 'week' : 'month';
}
