import { ArrowRight, ClipboardList, Copy, File, FileSpreadsheet, FlaskConical, Pencil, Sparkles, Trash, Upload } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { AppError } from '../../shared/errors';
import type { Dataset, OpenedFile, SheetData } from '../../shared/types';
import Illustration from '../components/Illustration';
import PageHeader, { Stepper } from '../components/PageHeader';
import type { TKey } from '../i18n/core';
import { Rich, useI18n } from '../i18n/I18n';
import { datasetFromCsv, datasetFromLines, datasetFromSheet, decodeBytes, pickSheet } from '../lib/data';
import { formatDate, formatDateTime } from '../lib/dates';
import { SAMPLE_CSV, SAMPLE_NAME } from '../lib/sample';
import { useStore } from '../state/store';

type Tab = 'file' | 'paste';

/** Columnas que añade la IA (se muestran en la tarjeta oscura). */
const AI_FIELDS: TKey[] = ['fields.sentiment', 'fields.category', 'fields.topic', 'fields.priority', 'fields.confidence', 'fields.reason'];

type Loaded = [Dataset, SheetData[] | null];

/** Convierte el archivo abierto en datos; si es Excel, elige la hoja con las opiniones y guarda las demás. */
function datasetFromOpened(file: OpenedFile, listColumn: string): Loaded {
  if (file.kind === 'excel') return [datasetFromSheet(file.name, pickSheet(file.sheets)), file.sheets];
  const text = decodeBytes(file.data);
  return [/\.txt$/i.test(file.name) ? datasetFromLines(file.name, text, listColumn) : datasetFromCsv(file.name, text), null];
}

function RecentAnalyses() {
  const { history, openAnalysis, setView, analysis, running } = useStore();
  const { t } = useI18n();
  const recent = history.slice(0, 3);
  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-ink">{t('load.recent')}</h2>
        <button className="shrink-0 text-xs font-semibold text-accent-ink hover:underline" onClick={() => setView('history')}>
          {t('load.seeHistory')}
        </button>
      </div>
      {recent.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink-2">{t('load.recentEmpty')}</p>
      ) : (
        <ul className="space-y-1.5">
          {recent.map((h) => {
            const done = h.pending === 0;
            const Icon = /xlsx|excel/i.test(h.name) ? FileSpreadsheet : File;
            return (
              <li key={h.id}>
                <button
                  className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-sunken ${
                    analysis?.id === h.id ? 'bg-sunken' : ''
                  }`}
                  disabled={running}
                  onClick={() => void openAnalysis(h.id)}
                >
                  <span className="icon-tile h-10 w-10 rounded-xl">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{h.name}</span>
                    <span className="block truncate text-xs text-ink-2">
                      {t('load.recentMeta', { n: h.classified, date: formatDateTime(h.updatedAt) })}
                    </span>
                  </span>
                  <span className={`chip ${done ? 'bg-pos-soft text-pos-ink' : 'bg-warn-soft text-warn-ink'}`}>
                    {done ? t('common.ready') : t('common.inProgress')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function LoadView() {
  const s = useStore();
  const { analysis, stats, loadDataset, setTextColumn, setDateColumn, renameAnalysis, running, classify, setView } = s;
  const { workbookSheets, setSheet } = s;
  const i18n = useI18n();
  const { t } = i18n;
  const [tab, setTab] = useState<Tab>('file');
  const [pasted, setPasted] = useState('');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const load = (build: () => Loaded) => {
    try {
      setError('');
      const [dataset, sheets] = build();
      loadDataset(dataset, sheets);
    } catch (err) {
      setError(err instanceof AppError ? i18n.error({ code: err.code, params: err.params }) : String(err));
    }
  };

  const pickFile = async () => {
    const res = await window.api.openFile();
    if (!res.ok) return setError(i18n.error(res));
    const file = res.data;
    if (file) load(() => datasetFromOpened(file, t('load.listColumn')));
  };

  // Se lee desde el proceso principal para que funcione igual que el botón (también con Excel)
  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (running) return;
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const res = await window.api.openDropped(file);
    if (!res.ok) return setError(i18n.error(res));
    load(() => datasetFromOpened(res.data, t('load.listColumn')));
  };

  const loadSample = () => load(() => [datasetFromCsv(SAMPLE_NAME, SAMPLE_CSV), null]);
  const pastedLines = pasted.split(/\r?\n/).filter((l) => l.trim()).length;
  const dataset = analysis?.dataset;
  const toClassify = stats.pending + stats.errors;
  const preview = analysis?.rows.slice(0, 6) ?? [];

  const start = () => {
    setView('results');
    void classify();
  };

  return (
    <div>
      <PageHeader
        eyebrow={analysis ? t('load.eyebrowCurrent') : t('load.eyebrowNew')}
        subtitle={analysis ? t('load.helloCurrent') : t('load.helloNew')}
        right={<Stepper />}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Héroe + carga */}
          <section className="card relative overflow-hidden p-10">
            <Illustration className="pointer-events-none absolute right-6 top-6 hidden w-[250px] lg:block" />
            {/* Los titulares largos (p. ej. en ruso) usan una letra algo menor para no ocupar media pantalla */}
            <h2
              className={`display relative max-w-[600px] lg:pr-[150px] 2xl:pr-0 ${
                t('load.hero').length > 44 ? 'text-[50px]' : 'text-[64px]'
              }`}
            >
              <Rich text={t('load.hero')} />
            </h2>
            <span className="tape mt-6 text-lg">{t('load.tape')}</span>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-ink-2">{t('load.intro')}</p>

            <div className="mt-7 inline-flex rounded-2xl bg-sunken p-1" role="tablist">
              {(
                [
                  ['file', t('load.tabFile'), File],
                  ['paste', t('load.tabPaste'), ClipboardList],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={tab === value}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    tab === value ? 'bg-surface text-accent-ink shadow-soft dark:bg-muted' : 'text-ink-2 hover:text-ink'
                  }`}
                  onClick={() => setTab(value)}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>

            {tab === 'file' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!running) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`mt-5 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
                  dragging ? 'border-accent bg-accent-soft' : 'border-warn-line bg-sunken/60'
                }`}
              >
                <span className="icon-tile mb-4 h-14 w-14 rounded-2xl text-accent-ink">
                  <Upload size={22} />
                </span>
                <p className="font-bold text-ink">{t('load.dropTitle')}</p>
                <p className="mt-1 text-xs text-ink-2">{t('load.dropFormats')}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button className="btn-primary px-6 py-3" onClick={pickFile} disabled={running}>
                    {t('load.pick')} <ArrowRight size={16} />
                  </button>
                  <button className="btn-outline px-6 py-3" onClick={loadSample} disabled={running}>
                    <FlaskConical size={16} /> {t('load.sample')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <textarea
                  className="input h-48 resize-none"
                  placeholder={t('load.pastePlaceholder')}
                  value={pasted}
                  disabled={running}
                  onChange={(e) => setPasted(e.target.value)}
                />
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    className="btn-primary"
                    disabled={running || pastedLines === 0}
                    onClick={() => load(() => [datasetFromLines(t('load.pasteName'), pasted, t('load.listColumn')), null])}
                  >
                    {pastedLines > 0 ? t('load.loadN', { n: pastedLines }) : t('load.loadEmpty')} <ArrowRight size={16} />
                  </button>
                  <button className="btn-outline" onClick={loadSample} disabled={running}>
                    <FlaskConical size={16} /> {t('load.sample')}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="mt-4 rounded-2xl bg-neg-soft px-4 py-3 text-sm font-medium text-neg-ink">{error}</p>}
          </section>

          {/* Datos cargados */}
          {dataset && analysis && (
            <section className="card p-8">
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <span className="icon-tile">
                  <FileSpreadsheet size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <label className="group flex items-center gap-2">
                    <input
                      className="w-full min-w-0 rounded-lg bg-transparent px-1 text-lg font-bold text-ink outline-none hover:bg-sunken focus:bg-sunken"
                      value={analysis.name}
                      onChange={(e) => renameAnalysis(e.target.value)}
                      aria-label={t('load.analysisName')}
                    />
                    <Pencil size={14} className="shrink-0 text-ink-3 opacity-0 group-hover:opacity-100" />
                  </label>
                  <p className="px-1 text-sm text-ink-2">
                    {dataset.name}
                    {dataset.sheetName ? t('load.sheetPart', { name: dataset.sheetName }) : ''} ·{' '}
                    {t('load.rowsCols', { rows: dataset.records.length, cols: dataset.headers.length })}
                  </p>
                </div>
                {stats.classified > 0 && (
                  <button className="btn-outline" onClick={() => setView('results')}>
                    {t('load.viewResults')} <ArrowRight size={16} />
                  </button>
                )}
                {toClassify > 0 && (
                  <button className="btn-primary" disabled={running} onClick={start}>
                    <Sparkles size={16} /> {t('load.classifyN', { n: toClassify })}
                  </button>
                )}
              </div>

              {workbookSheets && workbookSheets.length > 1 && dataset.sheetName && (
                <label className="mb-4 block">
                  <span className="eyebrow mb-1.5 block">{t('load.sheetLabel', { n: workbookSheets.length })}</span>
                  <select className="input" value={dataset.sheetName} disabled={running} onChange={(e) => setSheet(e.target.value)}>
                    {workbookSheets.map((sh) => (
                      <option key={sh.name} value={sh.name}>
                        {t('load.sheetOption', { name: sh.name, n: sh.records.length })}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {dataset.source !== 'list' && (
                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="eyebrow mb-1.5 block">{t('load.textColumn')}</span>
                    <select className="input" value={dataset.textColumn} disabled={running} onChange={(e) => setTextColumn(e.target.value)}>
                      {dataset.headers.map((h) => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="eyebrow mb-1.5 block" title={t('load.dateHint')}>
                      {t('load.dateColumn')}
                    </span>
                    <select className="input" value={dataset.dateColumn} disabled={running} onChange={(e) => setDateColumn(e.target.value)}>
                      <option value="">{t('load.noDate')}</option>
                      {dataset.headers
                        .filter((h) => h !== dataset.textColumn)
                        .map((h) => (
                          <option key={h}>{h}</option>
                        ))}
                    </select>
                  </label>
                </div>
              )}

              <div className="eyebrow mb-2">{t('load.cleaning')}</div>
              <div className="mb-2 grid grid-cols-3 gap-3">
                {[
                  { icon: Sparkles, label: t('load.toAnalyze'), value: stats.total - stats.duplicates - stats.empty, note: t('load.toAnalyzeNote') },
                  { icon: Copy, label: t('load.duplicates'), value: stats.duplicates, note: t('load.duplicatesNote') },
                  { icon: Trash, label: t('load.empty'), value: stats.empty, note: t('load.emptyNote') },
                ].map(({ icon: Icon, label, value, note }) => (
                  <div key={label} className="rounded-3xl bg-sunken p-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                      <Icon size={13} className="shrink-0" /> <span className="truncate">{label}</span>
                    </div>
                    <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
                    <div className="text-xs text-ink-3">{note}</div>
                  </div>
                ))}
              </div>
              {stats.duplicates + stats.empty > 0 && (
                <p className="mb-6 text-xs text-ink-2">{t('load.savedCalls', { n: stats.duplicates + stats.empty })}</p>
              )}

              <div className="eyebrow mb-2 mt-6">{t('load.preview')}</div>
              <div className="overflow-hidden rounded-3xl border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-sunken text-left">
                    <tr className="eyebrow">
                      <th className="w-12 px-4 py-2.5 font-semibold">#</th>
                      <th className="px-4 py-2.5 font-semibold">{dataset.textColumn}</th>
                      {dataset.dateColumn && <th className="w-32 px-4 py-2.5 font-semibold">{t('fields.date')}</th>}
                      <th className="w-36 px-4 py-2.5 font-semibold">{t('fields.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {preview.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2.5 tabular-nums text-ink-3">{r.id + 1}</td>
                        <td className="px-4 py-2.5">
                          <span className="line-clamp-2">{r.text || <em className="text-ink-3">{t('load.emptyText')}</em>}</span>
                        </td>
                        {dataset.dateColumn && (
                          <td className="px-4 py-2.5 text-ink-2">
                            {r.date ? formatDate(r.date) : <em className="text-ink-3">{t('load.invalidDate')}</em>}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-xs text-ink-2">
                          {r.status === 'duplicate'
                            ? t('load.statusDuplicate', { n: (r.duplicateOf ?? 0) + 1 })
                            : r.status === 'skipped'
                              ? t('load.statusEmpty')
                              : r.status === 'done'
                                ? t('load.statusDone')
                                : t('load.statusReady')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dataset.records.length > preview.length && (
                <p className="mt-2 px-1 text-xs text-ink-3">{t('load.moreRows', { n: dataset.records.length - preview.length })}</p>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-4xl bg-inverse p-7 text-on-inverse">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tape dark:text-on-inverse/70">{t('load.aiAdds')}</div>
            <p className="mt-3 font-display text-[40px] leading-[1] tracking-tight">
              <Rich text={t('load.aiColumns')} />
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {AI_FIELDS.map((k) => (
                <span key={k} className="rounded-full border border-inverse-line px-3.5 py-1.5 text-xs font-bold">
                  {t(k)}
                </span>
              ))}
            </div>
          </section>
          <RecentAnalyses />
        </aside>
      </div>
    </div>
  );
}
