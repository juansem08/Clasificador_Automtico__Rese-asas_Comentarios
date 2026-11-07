import { getLang, translate } from '../i18n/core';

const pad = (n: number) => String(n).padStart(2, '0');

function build(y: number, m: number, d: number): string | undefined {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return undefined;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return undefined; // p. ej. 31/02
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Convierte textos de fecha comunes a YYYY-MM-DD. Formato latino (día/mes/año) por defecto. */
export function parseDate(raw: string | undefined): string | undefined {
  const s = (raw ?? '').trim();
  if (!s) return undefined;

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return build(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    // dd/mm/aaaa salvo que el segundo número no pueda ser un mes (mm/dd/aaaa)
    return b > 12 && a <= 12 ? build(+m[3], a, b) : build(+m[3], b, a);
  }

  // Número de serie de Excel (días desde 1899-12-30)
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 86400000);
    return build(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  if (/[a-z]/i.test(s)) {
    const t = Date.parse(s);
    if (!Number.isNaN(t)) {
      const dt = new Date(t);
      return build(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    }
  }
  return undefined;
}

export type Granularity = 'week' | 'month';

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

/** Clave del periodo: lunes de la semana (YYYY-MM-DD) o mes (YYYY-MM). */
export function periodKey(iso: string, g: Granularity): string {
  if (g === 'month') return iso.slice(0, 7);
  const d = toDate(iso);
  const day = (d.getUTCDay() + 6) % 7; // 0 = lunes
  d.setUTCDate(d.getUTCDate() - day);
  return toIso(d);
}

export function nextPeriod(key: string, g: Granularity): string {
  if (g === 'month') {
    const [y, m] = key.split('-').map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  }
  const d = toDate(key);
  d.setUTCDate(d.getUTCDate() + 7);
  return toIso(d);
}

// Los formatos de fecha siguen el idioma elegido en la app
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(getLang(), opts);

export function periodLabel(key: string, g: Granularity): string {
  if (g === 'month') return fmt({ month: 'short', year: 'numeric', timeZone: 'UTC' }).format(toDate(`${key}-01`));
  const d = fmt({ day: 'numeric', month: 'short', timeZone: 'UTC' }).format(toDate(key));
  return translate(getLang(), 'charts.week', { d });
}

export const formatDate = (iso: string) => fmt({ day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(toDate(iso));

export const formatDateTime = (iso: string) => fmt({ dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
