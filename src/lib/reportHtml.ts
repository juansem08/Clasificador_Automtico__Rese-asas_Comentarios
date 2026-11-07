import type { Analysis, Lang } from '../../shared/types';
import { STACK_ORDER as SENTIMENTS } from '../components/charts/order';
import { categoryLabel, translate, type TKey } from '../i18n/core';
import { isClassified } from './data';
import { formatDateTime } from './dates';
import { SENTIMENT_HEX } from './labels';
import { pct, type Stats, type TrendPoint } from './stats';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** "*cursiva*" del diccionario → <em> (el texto ya viene escapado). */
const richHtml = (s: string) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/_([^_]+)_/g, '$1');

function stackedBar(counts: Record<string, number>, total: number, scaleMax: number): string {
  const width = scaleMax ? (total / scaleMax) * 100 : 0;
  const segs = SENTIMENTS.filter((s) => counts[s] > 0)
    .map((s) => `<div style="flex:${counts[s]};background:${SENTIMENT_HEX[s]}"></div>`)
    .join('');
  return `<div class="track"><div class="stack" style="width:${width}%">${segs}</div></div>`;
}

/** HTML autónomo (tema claro) que Electron convierte a PDF, en el idioma elegido. */
export function buildReportHtml(analysis: Analysis, stats: Stats, trend: TrendPoint[], lang: Lang): string {
  const t = (k: TKey, p?: Record<string, string | number>) => translate(lang, k, p);
  const sent = (s: (typeof SENTIMENTS)[number]) => t(`sentiment.${s}`);
  const plural = (s: (typeof SENTIMENTS)[number]) => t(`sentimentPlural.${s}`);
  const cat = (name: string) => esc(categoryLabel(lang, name));
  const c = stats.classified;
  const rep = analysis.report;
  const maxCat = Math.max(...stats.categories.map((x) => x.total), 1);
  const maxTrend = Math.max(...trend.map((p) => p.total), 1);
  const critical = analysis.rows.filter((r) => r.prioridad === 'Alta' && isClassified(r)).slice(0, 10);

  const legend = `<div class="legend">${SENTIMENTS.map((s) => `<span><i style="background:${SENTIMENT_HEX[s]}"></i>${esc(plural(s))}</span>`).join('')}</div>`;

  const kpis = [
    [t('pdf.classified'), String(c)],
    [plural('Positivo'), `${pct(stats.sentiment.Positivo, c)}%`],
    [plural('Negativo'), `${pct(stats.sentiment.Negativo, c)}%`],
    [t('pdf.net'), `${stats.net > 0 ? '+' : ''}${stats.net}`],
    [t('pdf.highPriority'), String(stats.priority.Alta)],
  ];

  const sentimentSegs = SENTIMENTS.filter((s) => stats.sentiment[s] > 0)
    .map((s) => {
      const p = pct(stats.sentiment[s], c);
      return `<div style="flex:${stats.sentiment[s]};background:${SENTIMENT_HEX[s]}">${p >= 8 ? `${p}%` : ''}</div>`;
    })
    .join('');

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(analysis.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1f1a17; margin: 0; font-size: 12px; line-height: 1.5; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-weight: 400; font-size: 32px; margin: 0 0 2px; letter-spacing: -0.5px; }
  h1 em { color: #b45f0a; }
  h2 { font-size: 14px; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ece4de; }
  .titular { font-family: Georgia, 'Times New Roman', serif; font-size: 22px; line-height: 1.2; margin: 6px 0 8px; }
  .muted { color: #5d5550; }
  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 14px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
  .kpi b { display: block; font-size: 18px; }
  .seg { display: flex; gap: 2px; height: 26px; border-radius: 4px; overflow: hidden; }
  .seg div { color: #fff; font-weight: 600; font-size: 11px; display: flex; align-items: center; padding-left: 6px; }
  .legend { display: flex; gap: 14px; margin: 6px 0 4px; color: #475569; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 4px 6px; text-align: left; vertical-align: middle; }
  th { color: #64748b; font-weight: 600; font-size: 11px; }
  tr + tr td { border-top: 1px solid #f1f5f9; }
  .track { width: 100%; }
  .stack { display: flex; gap: 2px; height: 14px; }
  .stack div:last-child { border-radius: 0 3px 3px 0; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; margin-bottom: 6px; page-break-inside: avoid; }
  .tag { display: inline-block; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 5px; font-size: 10px; color: #475569; margin-left: 6px; }
  .trend { display: flex; align-items: flex-end; border-bottom: 1px solid #cbd5e1; height: 130px; }
  .tcell { flex: 1; display: flex; justify-content: center; align-items: flex-end; height: 100%; }
  .col { width: 60%; max-width: 24px; display: flex; flex-direction: column-reverse; gap: 2px; }
  .col div:last-child { border-radius: 3px 3px 0 0; }
  .xl { display: flex; font-size: 9px; color: #64748b; margin-top: 3px; }
  .xl span { flex: 1; text-align: center; white-space: nowrap; overflow: visible; }
</style></head><body>
  <h1>${richHtml(t('pdf.title'))}</h1>
  <div class="muted">${esc(analysis.name)} · ${formatDateTime(new Date().toISOString())}${rep ? ` · ${esc(t('pdf.aiAnalysis', { model: rep.modelo }))}` : ''}</div>

  <div class="kpis">${kpis.map(([l, v]) => `<div class="kpi"><span class="muted">${esc(l)}</span><b>${v}</b></div>`).join('')}</div>

  <h2>${esc(t('dashboard.distribution'))}</h2>
  <div class="seg">${sentimentSegs}</div>
  ${legend}
  <div class="muted">${SENTIMENTS.map((s) => `${esc(plural(s))}: ${stats.sentiment[s]}`).join(' · ')}</div>

  <h2>${esc(t('dashboard.categories'))}</h2>
  ${legend}
  <table><tr><th style="width:120px">${esc(t('fields.category'))}</th><th style="width:55%"></th>${SENTIMENTS.map((s) => `<th class="num">${esc(sent(s).slice(0, 3))}.</th>`).join('')}<th class="num">${esc(t('charts.total'))}</th></tr>
  ${stats.categories
    .map(
      (ct) =>
        `<tr><td>${cat(ct.name)}</td><td>${stackedBar(ct.counts, ct.total, maxCat)}</td>${SENTIMENTS.map((s) => `<td class="num">${ct.counts[s]}</td>`).join('')}<td class="num"><b>${ct.total}</b></td></tr>`,
    )
    .join('')}
  </table>

  ${
    trend.length > 1
      ? `<h2>${esc(t('dashboard.trend'))}</h2>${legend}
  <div class="trend">${trend
    .map(
      (p) =>
        `<div class="tcell"><div class="col" style="height:${(p.total / maxTrend) * 100}%">${SENTIMENTS.filter((s) => p.counts[s] > 0)
          .map((s) => `<div style="flex:${p.counts[s]};background:${SENTIMENT_HEX[s]}"></div>`)
          .join('')}</div></div>`,
    )
    .join('')}</div>
  <div class="xl">${trend.map((p, i) => `<span>${i % Math.ceil(trend.length / 8) === 0 ? esc(p.label) : ''}</span>`).join('')}</div>`
      : ''
  }

  ${
    rep
      ? `<h2>${esc(t('pdf.execSummary'))}</h2>${rep.titular ? `<p class="titular">${esc(rep.titular)}</p>` : ''}<p>${esc(rep.resumen)}</p>
  <h2>${esc(t('report.complaints'))}</h2>${rep.quejas.map((q, i) => `<div class="card"><b>${i + 1}. ${esc(q.titulo)}</b><span class="tag">${cat(q.categoria)}</span><div>${esc(q.detalle)}</div></div>`).join('')}
  ${rep.fortalezas.length ? `<h2>${esc(t('report.strengths'))}</h2>${rep.fortalezas.map((f) => `<div class="card"><b>${esc(f.titulo)}</b><div>${esc(f.detalle)}</div></div>`).join('')}` : ''}
  <h2>${esc(t('report.recommendations'))}</h2>${rep.recomendaciones.map((r, i) => `<div class="card"><b>${i + 1}.</b> ${esc(r.accion)}<span class="tag">${esc(t(`impact.${r.impacto}`))}</span></div>`).join('')}`
      : `<p class="muted">${esc(t('pdf.noReport'))}</p>`
  }

  ${
    critical.length
      ? `<h2>${esc(t('pdf.highPriorityOps'))}</h2>${critical.map((r) => `<div class="card">“${esc(r.text)}”<span class="tag">${cat(r.categoria ?? '')}</span>${r.motivo ? `<div class="muted">${esc(r.motivo)}</div>` : ''}</div>`).join('')}`
      : ''
  }
</body></html>`;
}
