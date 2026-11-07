import Papa from 'papaparse';
import { SENTIMENTS, type Analysis, type Cell, type Lang, type ReportInput, type Row, type SheetSpec } from '../../shared/types';
import { allTranslations, categoryLabel, translate, translateMaybe, type TKey } from '../i18n/core';
import { isClassified } from './data';
import { formatDateTime } from './dates';
import { pct, type Stats, type TrendPoint } from './stats';

/** Columnas que añade la app, en orden. */
const AI_KEYS: TKey[] = [
  'fields.sentiment',
  'fields.category',
  'fields.topic',
  'fields.priority',
  'fields.confidencePct',
  'fields.reason',
  'fields.reply',
  'fields.note',
];
/** Posición (dentro de AI_KEYS) de las columnas de texto largo. */
const MOTIVO = 5;
const RESPUESTA = 6;
/** Nombres de esas columnas en cualquier idioma: si se vuelve a cargar un archivo exportado, se sustituyen. */
const AI_NAMES_ANY_LANG = new Set(AI_KEYS.flatMap((k) => allTranslations(k)));

/** Texto de un error guardado en una fila (código traducible o texto libre). */
const rowError = (lang: Lang, error = '') => translateMaybe(lang, `errors.${error}`) ?? error;

function observation(lang: Lang, r: Row): string {
  const t = (k: TKey, p?: Record<string, string | number>) => translate(lang, k, p);
  if (r.status === 'skipped') return t('exportFile.obsEmpty');
  if (r.status === 'duplicate') return t('exportFile.obsDuplicate', { n: (r.duplicateOf ?? 0) + 1 });
  if (r.status === 'error') return t('exportFile.obsError', { e: rowError(lang, r.error) });
  if (r.status === 'pending') return t('exportFile.obsPending');
  if (r.edited) return t('exportFile.obsEdited');
  return r.reviewed ? t('exportFile.obsReviewed') : '';
}

/** Columnas originales + columnas de la IA (las que ya existan se sobrescriben). */
function classifiedTable(analysis: Analysis, lang: Lang): { headers: string[]; data: Cell[][] } {
  const { dataset, rows } = analysis;
  const original = dataset.headers.filter((h) => !AI_NAMES_ANY_LANG.has(h));
  const headers = [...original, ...AI_KEYS.map((k) => translate(lang, k))];
  const data = dataset.records.map((record, i) => {
    const r = rows[i];
    return [
      ...original.map((h) => record[h] ?? ''),
      r?.sentimiento ? translate(lang, `sentiment.${r.sentimiento}`) : '',
      r?.categoria ? categoryLabel(lang, r.categoria) : '',
      r?.tema ?? '',
      r?.prioridad ? translate(lang, `priority.${r.prioridad}`) : '',
      r?.confianza ?? '',
      r?.motivo ?? '',
      r?.respuesta ?? '',
      r ? observation(lang, r) : '',
    ];
  });
  return { headers, data };
}

export function buildCsv(analysis: Analysis, delimiter: ',' | ';', lang: Lang): string {
  const { headers, data } = classifiedTable(analysis, lang);
  return Papa.unparse({ fields: headers, data }, { delimiter, newline: '\r\n' });
}

export function buildWorkbook(analysis: Analysis, stats: Stats, trend: TrendPoint[], lang: Lang): SheetSpec[] {
  const t = (k: TKey, p?: Record<string, string | number>) => translate(lang, k, p);
  const sent = (s: (typeof SENTIMENTS)[number]) => t(`sentiment.${s}`);
  const { headers, data } = classifiedTable(analysis, lang);
  const n = headers.length - AI_KEYS.length;
  const textIdx = headers.indexOf(analysis.dataset.textColumn);

  const sheets: SheetSpec[] = [
    {
      name: t('exportFile.sheetData'),
      rows: [headers, ...data],
      headerRows: [0],
      widths: headers.map((_, i) => (i === textIdx ? 60 : i === n + MOTIVO || i === n + RESPUESTA ? 50 : 16)),
      wrapColumns: [textIdx, n + MOTIVO, n + RESPUESTA].filter((i) => i >= 0),
      autoFilter: true,
    },
  ];

  const c = stats.classified;
  const summary: Cell[][] = [
    [t('exportFile.indicator'), t('exportFile.value')],
    [t('exportFile.analysis'), analysis.name],
    [t('exportFile.loaded'), stats.total],
    [t('exportFile.classified'), c],
    [t('exportFile.duplicates'), stats.duplicates],
    [t('exportFile.empty'), stats.empty],
    [t('exportFile.net'), stats.net],
    [t('exportFile.avgConf'), stats.avgConfidence],
    [t('exportFile.highPriority'), stats.priority.Alta],
    [
      t('exportFile.topProblem'),
      stats.topProblem
        ? t('exportFile.topProblemVal', { cat: categoryLabel(lang, stats.topProblem.name), n: stats.topProblem.count })
        : '—',
    ],
    [],
    [t('fields.sentiment'), t('exportFile.count'), '%'],
    ...SENTIMENTS.map((s) => [sent(s), stats.sentiment[s], pct(stats.sentiment[s], c)]),
    [],
    [t('fields.category'), sent('Positivo'), sent('Negativo'), sent('Neutro'), t('charts.total'), t('charts.negPct')],
    ...stats.categories.map((cat) => [
      categoryLabel(lang, cat.name),
      cat.counts.Positivo,
      cat.counts.Negativo,
      cat.counts.Neutro,
      cat.total,
      pct(cat.counts.Negativo, cat.total),
    ]),
  ];
  sheets.push({
    name: t('exportFile.sheetSummary'),
    rows: summary,
    headerRows: [0, 11, 11 + SENTIMENTS.length + 2],
    widths: [38, 16, 12, 12, 10, 14],
  });

  if (trend.length > 0) {
    sheets.push({
      name: t('exportFile.sheetTrend'),
      rows: [
        [t('exportFile.period'), sent('Positivo'), sent('Negativo'), sent('Neutro'), t('charts.total'), t('charts.negPct')],
        ...trend.map((p) => [p.label, p.counts.Positivo, p.counts.Negativo, p.counts.Neutro, p.total, pct(p.counts.Negativo, p.total)]),
      ],
      headerRows: [0],
      widths: [18, 12, 12, 12, 10, 14],
      autoFilter: true,
    });
  }

  const critical = analysis.rows.filter((r) => r.prioridad === 'Alta' && isClassified(r));
  if (critical.length > 0) {
    sheets.push({
      name: t('exportFile.sheetHigh'),
      rows: [
        [t('exportFile.row'), t('fields.opinion'), t('fields.category'), t('fields.topic'), t('fields.reason'), t('fields.reply')],
        ...critical.map((r) => [
          r.id + 1,
          r.text,
          r.categoria ? categoryLabel(lang, r.categoria) : '',
          r.tema ?? '',
          r.motivo ?? '',
          r.respuesta ?? '',
        ]),
      ],
      headerRows: [0],
      widths: [8, 60, 16, 22, 40, 50],
      wrapColumns: [1, 4, 5],
      autoFilter: true,
    });
  }

  const rep = analysis.report;
  if (rep) {
    const rows: Cell[][] = [
      [t('exportFile.reportTitle'), t('exportFile.generatedWith', { date: formatDateTime(rep.generadoEn), model: rep.modelo })],
      ...(rep.titular ? [[t('exportFile.headline'), rep.titular]] : []),
      [t('report.summary'), rep.resumen],
      [],
    ];
    const headerRows = [0];
    headerRows.push(rows.length);
    rows.push([t('report.complaints'), t('exportFile.detail')]);
    rep.quejas.forEach((q) => rows.push([`${q.titulo} (${categoryLabel(lang, q.categoria)})`, q.detalle]));
    rows.push([]);
    headerRows.push(rows.length);
    rows.push([t('report.strengths'), t('exportFile.detail')]);
    rep.fortalezas.forEach((f) => rows.push([f.titulo, f.detalle]));
    rows.push([]);
    headerRows.push(rows.length);
    rows.push([t('exportFile.recommendation'), t('exportFile.impact')]);
    rep.recomendaciones.forEach((r) => rows.push([r.accion, t(`impactShort.${r.impacto}`)]));
    sheets.push({ name: t('exportFile.sheetReport'), rows, headerRows, widths: [50, 90], wrapColumns: [0, 1] });
  }

  return sheets;
}

/** Datos que se envían a la IA para el informe ejecutivo (estadísticas + muestra priorizada). */
export function buildReportInput(analysis: Analysis, stats: Stats, trend: TrendPoint[]): ReportInput {
  const done = analysis.rows.filter((r) => isClassified(r) && r.status === 'done');
  const order = (r: Row) => (r.prioridad === 'Alta' ? 0 : r.sentimiento === 'Negativo' ? 1 : r.sentimiento === 'Positivo' ? 2 : 3);
  const sample = [...done].sort((a, b) => order(a) - order(b)).slice(0, 250);
  return {
    nombre: analysis.name,
    estadisticas: {
      clasificadas: stats.classified,
      sentimiento: stats.sentiment,
      porcentaje: Object.fromEntries(SENTIMENTS.map((s) => [s, pct(stats.sentiment[s], stats.classified)])),
      categorias: stats.categories.map((c) => ({ categoria: c.name, ...c.counts, total: c.total })),
      prioridadAlta: stats.priority.Alta,
      sentimientoNeto: stats.net,
      tendencia: trend.map((p) => ({ periodo: p.label, ...p.counts })),
    },
    opiniones: sample.map((r) => ({
      sentimiento: r.sentimiento!,
      categoria: r.categoria!,
      prioridad: r.prioridad ?? '',
      texto: r.text.slice(0, 280),
    })),
  };
}
