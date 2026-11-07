import Papa from 'papaparse';
import { AppError } from '../../shared/errors';
import type { Dataset, Row, SheetData } from '../../shared/types';
import { parseDate } from './dates';

export const LIST_COLUMN = 'Opinión';
/** Por debajo de esta confianza (%) se sugiere revisar la clasificación. */
export const LOW_CONFIDENCE = 70;

/** Decodifica bytes como UTF-8 y, si no es válido, como Windows-1252 (CSV guardados desde Excel). */
export function decodeBytes(data: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(data);
  }
}

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Texto normalizado para detectar duplicados (sin mayúsculas, tildes, signos ni espacios extra). */
export const normalizeText = (s: string) =>
  stripAccents(s.toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const TEXT_HINTS = ['resena', 'review', 'comentario', 'comment', 'opinion', 'texto', 'text', 'feedback', 'mensaje', 'descripcion'];
const DATE_HINTS = ['fecha', 'date', 'dia', 'created', 'timestamp', 'periodo', 'hora'];

const headerMatches = (h: string, hints: string[]) => hints.some((hint) => stripAccents(h.toLowerCase()).includes(hint));

export function guessTextColumn(headers: string[], records: Record<string, string>[]): string {
  const byName = headers.find((h) => headerMatches(h, TEXT_HINTS));
  if (byName) return byName;
  const sample = records.slice(0, 200);
  let best = headers[0] ?? '';
  let bestLen = -1;
  for (const h of headers) {
    const avg = sample.reduce((acc, r) => acc + (r[h]?.length ?? 0), 0) / Math.max(sample.length, 1);
    if (avg > bestLen) {
      bestLen = avg;
      best = h;
    }
  }
  return best;
}

function dateRatio(records: Record<string, string>[], column: string): number {
  const sample = records.slice(0, 200).filter((r) => r[column]?.trim());
  if (sample.length === 0) return 0;
  return sample.filter((r) => parseDate(r[column])).length / sample.length;
}

/** Devuelve la columna de fecha más probable, o '' si no hay. */
export function guessDateColumn(headers: string[], records: Record<string, string>[], textColumn: string): string {
  const candidates = headers.filter((h) => h !== textColumn);
  const byName = candidates.find((h) => headerMatches(h, DATE_HINTS) && dateRatio(records, h) >= 0.6);
  if (byName) return byName;
  return candidates.find((h) => dateRatio(records, h) >= 0.9) ?? '';
}

function fromTable(source: Dataset['source'], name: string, headers: string[], records: Record<string, string>[]): Dataset {
  const textColumn = guessTextColumn(headers, records);
  return { source, name, headers, records, textColumn, dateColumn: guessDateColumn(headers, records, textColumn) };
}

export function datasetFromCsv(name: string, text: string): Dataset {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  const headers = (parsed.meta.fields ?? []).filter((h) => h.length > 0);
  if (headers.length === 0) throw new AppError('csv_no_headers');
  if (parsed.data.length === 0) throw new AppError('csv_no_rows');
  return fromTable('csv', name, headers, parsed.data);
}

export function datasetFromSheet(fileName: string, sheet: SheetData): Dataset {
  return { ...fromTable('excel', fileName, sheet.headers, sheet.records), sheetName: sheet.name };
}

/** Hoja más probable con las opiniones: la primera con una columna tipo "opinión/comentario"; si no, la primera. */
export function pickSheet(sheets: SheetData[]): SheetData {
  return sheets.find((s) => s.headers.some((h) => headerMatches(h, TEXT_HINTS))) ?? sheets[0];
}

/** `column`: nombre de la única columna (traducido al idioma de la interfaz). */
export function datasetFromLines(name: string, text: string, column = LIST_COLUMN): Dataset {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new AppError('list_empty');
  return {
    source: 'list',
    name,
    headers: [column],
    records: lines.map((l) => ({ [column]: l })),
    textColumn: column,
    dateColumn: '',
  };
}

/** Crea las filas a clasificar: marca vacías y duplicadas para no enviarlas a la IA. */
export function buildRows(dataset: Dataset): Row[] {
  const seen = new Map<string, number>();
  return dataset.records.map((record, id) => {
    const text = (record[dataset.textColumn] ?? '').trim();
    const extra = columnValues(record, dataset);
    if (!text) return { id, text, ...extra, status: 'skipped' };
    const key = normalizeText(text);
    const original = seen.get(key);
    if (original !== undefined) return { id, text, ...extra, status: 'duplicate', duplicateOf: original };
    seen.set(key, id);
    return { id, text, ...extra, status: 'pending' };
  });
}

function columnValues(record: Record<string, string> | undefined, dataset: Dataset): Pick<Row, 'date'> {
  return { date: dataset.dateColumn ? parseDate(record?.[dataset.dateColumn]) : undefined };
}

/** Recalcula la fecha de cada fila (conserva las clasificaciones). */
export function applyColumns(rows: Row[], dataset: Dataset): Row[] {
  return rows.map((r) => ({ ...r, ...columnValues(dataset.records[r.id], dataset) }));
}

export const isClassified = (r: Row) => Boolean(r.sentimiento && r.categoria);

export const fileBase = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_') || 'opiniones';
