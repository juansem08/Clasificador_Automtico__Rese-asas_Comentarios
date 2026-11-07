import { ChevronLeft, ChevronRight, Frown, LoaderCircle, Meh, MessageSquareReply, RotateCcw, Search, Smile, Sparkles, Square, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PRIORITIES, type Priority, type Sentiment } from '../../shared/types';
import { ConfidenceValue, PriorityChip, SentimentChip } from '../components/Chips';
import EmptyState from '../components/EmptyState';
import ExportMenu from '../components/ExportMenu';
import PageHeader from '../components/PageHeader';
import ReviewPanel from '../components/ReviewPanel';
import { useI18n } from '../i18n/I18n';
import { SENTIMENT_STYLE } from '../lib/labels';
import { needsReview } from '../lib/stats';
import { useStore } from '../state/store';
import { EMPTY_FILTERS } from '../types';

const PAGE_SIZE = 100;
const COLS = 'grid-cols-[minmax(0,1fr)_108px_minmax(72px,124px)_84px_44px]';

const FACES: { s: Sentiment; icon: typeof Smile }[] = [
  { s: 'Positivo', icon: Smile },
  { s: 'Neutro', icon: Meh },
  { s: 'Negativo', icon: Frown },
];

export default function ResultsView() {
  const s = useStore();
  const { analysis, stats, running, progress, classify, cancel, reclassifyAll, filters, setFilters, allCategories } = s;
  const { generateReplies, replyingIds, setView, settings, selectedId, setSelectedId } = s;
  const i18n = useI18n();
  const { t } = i18n;
  const [page, setPage] = useState(0);
  const [confirmReclass, setConfirmReclass] = useState(false);

  const rows = useMemo(() => analysis?.rows ?? [], [analysis?.rows]);
  /** Filas que cumplen todo salvo el sentimiento (para los contadores de las pestañas). */
  const baseFiltered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q || r.text.toLowerCase().includes(q) || r.motivo?.toLowerCase().includes(q) || r.tema?.includes(q)) &&
        (!filters.categoria || r.categoria === filters.categoria) &&
        (!filters.prioridad || r.prioridad === filters.prioridad) &&
        (!filters.lowConfidence || needsReview(r)),
    );
  }, [rows, filters.search, filters.categoria, filters.prioridad, filters.lowConfidence]);
  const filtered = useMemo(
    () => (filters.sentimiento ? baseFiltered.filter((r) => r.sentimiento === filters.sentimiento) : baseFiltered),
    [baseFiltered, filters.sentimiento],
  );

  useEffect(() => setPage(0), [filters]);

  // Siempre hay una opinión seleccionada (la primera del filtro si la actual no está)
  useEffect(() => {
    if (filtered.length === 0) return;
    if (selectedId === null || !filtered.some((r) => r.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId, setSelectedId]);

  // Mantener visible la página de la opinión seleccionada
  useEffect(() => {
    const idx = filtered.findIndex((r) => r.id === selectedId);
    if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE));
  }, [selectedId, filtered]);

  if (!analysis) {
    return (
      <EmptyState
        icon={Upload}
        title={t('results.emptyTitle')}
        text={t('results.emptyText')}
        action={
          <button className="btn-primary" onClick={() => setView('load')}>
            {t('results.goLoad')}
          </button>
        }
      />
    );
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const toClassify = stats.pending + stats.errors;
  const pendingReplies = rows.filter((r) => r.status === 'done' && r.sentimiento === 'Negativo' && !r.respuesta).length;
  const pctDone = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const extraFilters = filters.categoria || filters.prioridad || filters.lowConfidence || filters.search;

  const selIndex = filtered.findIndex((r) => r.id === selectedId);
  const selRow = selIndex >= 0 ? filtered[selIndex] : undefined;

  const tabs: { value: Sentiment | ''; label: string; count: number }[] = [
    { value: '', label: t('results.all'), count: baseFiltered.length },
    ...(['Positivo', 'Neutro', 'Negativo'] as const).map((v) => ({
      value: v,
      label: i18n.sentimentPlural(v),
      count: baseFiltered.filter((r) => r.sentimiento === v).length,
    })),
  ];

  const actions = running ? (
    <button className="btn-outline" onClick={cancel}>
      <Square size={14} /> {t('results.stop')}
    </button>
  ) : (
    <>
      {stats.pending > 0 && (
        <button className="btn-primary" onClick={() => void classify()}>
          <Sparkles size={16} />{' '}
          {stats.classified > 0 ? t('results.continueN', { n: toClassify }) : t('results.classifyN', { n: toClassify })}
        </button>
      )}
      {stats.pending === 0 && stats.errors > 0 && (
        <button className="btn-primary" onClick={() => void classify(true)}>
          <RotateCcw size={15} /> {t('results.retryN', { n: stats.errors })}
        </button>
      )}
      {toClassify === 0 &&
        (confirmReclass ? (
          <span className="flex items-center gap-2 rounded-full bg-surface py-1 pl-4 pr-1 text-sm">
            {t('results.reclassifyConfirm')}
            <button className="btn-ghost px-3 py-1.5" onClick={() => setConfirmReclass(false)}>
              {t('common.no')}
            </button>
            <button
              className="btn-primary px-4 py-1.5"
              onClick={() => {
                setConfirmReclass(false);
                void reclassifyAll();
              }}
            >
              {t('results.yesReclassify')}
            </button>
          </span>
        ) : (
          <button className="btn-outline" onClick={() => setConfirmReclass(true)} disabled={stats.classified === 0}>
            <RotateCcw size={15} /> {t('results.reclassify')}
          </button>
        ))}
      {stats.classified > 0 && <ExportMenu disabled={false} />}
      {(pendingReplies > 0 || replyingIds.size > 0) && (
        <button
          className="btn-outline"
          disabled={replyingIds.size > 0}
          onClick={() => void generateReplies()}
          title={t('results.repliesHint')}
        >
          {replyingIds.size > 0 ? <LoaderCircle size={15} className="animate-spin" /> : <MessageSquareReply size={15} />}
          {replyingIds.size > 0 ? t('results.writingN', { n: replyingIds.size }) : t('results.repliesN', { n: pendingReplies })}
        </button>
      )}
    </>
  );

  const headers = [t('fields.opinion'), t('fields.sentiment'), t('fields.category'), t('fields.priority'), t('fields.confShort')];

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_290px] gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-h-0 min-w-0 flex-col">
        <PageHeader
          eyebrow={toClassify > 0 ? t('results.eyebrowClassify') : t('results.eyebrowReview')}
          title={t('results.title')}
          actions={actions}
          compact
        />

        {running && (
          <div className="-mt-2 mb-5">
            <div className="mb-1.5 flex justify-between text-xs text-ink-2">
              <span className="flex items-center gap-1.5">
                <LoaderCircle size={13} className="animate-spin" />
                {t('results.analyzingWith', { model: settings.model })}
              </span>
              <span className="tabular-nums">
                {progress.done} / {progress.total} ({pctDone}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pctDone}%` }} />
            </div>
          </div>
        )}

        {/* En ventanas bajas se ocultan: las pestañas ya muestran las mismas cifras */}
        <div className="mb-5 grid grid-cols-3 gap-4 [@media(max-height:820px)]:hidden">
          {FACES.map(({ s: sent, icon: Icon }) => (
            <button
              key={sent}
              className={`card flex items-center gap-4 p-5 text-left transition hover:ring-2 hover:ring-accent/30 ${
                filters.sentimiento === sent ? 'ring-2 ring-accent' : ''
              }`}
              onClick={() => setFilters({ ...filters, sentimiento: filters.sentimiento === sent ? '' : sent })}
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${SENTIMENT_STYLE[sent].chip}`}>
                <Icon size={22} />
              </span>
              <span className="min-w-0">
                <span className="block text-3xl font-bold leading-none text-ink">{stats.sentiment[sent]}</span>
                <span className="mt-1 block truncate text-sm text-ink-2">{i18n.sentimentPlural(sent)}</span>
              </span>
            </button>
          ))}
        </div>

        <section className="card flex min-h-0 flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="seg" role="tablist" aria-label={t('results.filterSentiment')}>
              {tabs.map((tab) => (
                <button
                  key={tab.label}
                  role="tab"
                  aria-selected={filters.sentimiento === tab.value}
                  className="seg-item"
                  onClick={() => setFilters({ ...filters, sentimiento: tab.value })}
                >
                  {tab.label}
                  {tab.value === '' ? ` · ${tab.count}` : <span className="text-xs text-ink-3">{tab.count}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <div className="relative min-w-44 flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                className="input py-1.5 pl-9 text-xs"
                placeholder={t('results.search')}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select
              className="input w-auto py-1.5 pr-8 text-xs"
              value={filters.categoria}
              onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
              aria-label={t('results.filterCategory')}
            >
              <option value="">{t('results.allCategories')}</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {i18n.category(c)}
                </option>
              ))}
            </select>
            <select
              className="input w-auto py-1.5 pr-8 text-xs"
              value={filters.prioridad}
              onChange={(e) => setFilters({ ...filters, prioridad: e.target.value as Priority | '' })}
              aria-label={t('results.filterPriority')}
            >
              <option value="">{t('results.allPriorities')}</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {i18n.priority(p)}
                </option>
              ))}
            </select>
            <button
              aria-pressed={filters.lowConfidence}
              className={`chip px-3 py-1.5 transition ${
                filters.lowConfidence ? 'bg-warn-soft text-warn-ink ring-1 ring-warn-line' : 'bg-sunken text-ink-2 hover:text-ink'
              }`}
              onClick={() => setFilters({ ...filters, lowConfidence: !filters.lowConfidence })}
            >
              {t('results.toReview', { n: stats.lowConfidence })}
            </button>
            {extraFilters && (
              <button
                className="chip px-3 py-1.5 text-ink-2 hover:text-ink"
                onClick={() => setFilters({ ...EMPTY_FILTERS, sentimiento: filters.sentimiento })}
              >
                <X size={13} /> {t('results.clearFilters')}
              </button>
            )}
          </div>

          <div className={`mt-4 grid ${COLS} gap-3 px-4 pb-2`}>
            {headers.map((h, i) => (
              <span key={h} title={h} className={`eyebrow truncate tracking-[0.05em] ${i === 4 ? 'text-right' : ''}`}>
                {h}
              </span>
            ))}
          </div>

          <div className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1" role="listbox" aria-label={t('results.listAria')}>
            {visible.map((r) => {
              const sel = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  role="option"
                  aria-selected={sel}
                  className={`grid w-full ${COLS} items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                    sel ? 'bg-accent-soft ring-1 ring-accent' : 'hover:bg-sunken'
                  }`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <span className="line-clamp-2 leading-snug text-ink">
                    {r.text || <em className="text-ink-3">{t('load.emptyText')}</em>}
                  </span>
                  {r.sentimiento && r.categoria ? (
                    <>
                      <span>
                        <SentimentChip value={r.sentimiento} />
                      </span>
                      <span className="truncate text-ink" title={r.tema}>
                        {i18n.category(r.categoria)}
                      </span>
                      <span>{r.prioridad && <PriorityChip value={r.prioridad} />}</span>
                      <span className="text-right">
                        <ConfidenceValue value={r.confianza} edited={r.edited} reviewed={r.reviewed} />
                      </span>
                    </>
                  ) : (
                    <span className="col-span-4 text-xs">
                      {r.status === 'error' ? (
                        <span className="font-semibold text-neg-ink">{t('results.rowError')}</span>
                      ) : r.status === 'skipped' ? (
                        <span className="text-ink-3">{t('results.rowEmpty')}</span>
                      ) : r.status === 'duplicate' ? (
                        <span className="text-ink-3">{t('results.rowDuplicate')}</span>
                      ) : (
                        <span className="text-ink-3">{t('results.rowPending')}</span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
            {visible.length === 0 && <p className="p-10 text-center text-sm text-ink-2">{t('results.noMatch')}</p>}
          </div>

          <div className="mt-3 flex items-center justify-between px-1 text-xs text-ink-2">
            <span>{t('results.footer', { shown: filtered.length, total: rows.length })}</span>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button
                  className="btn-icon h-8 w-8"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label={t('results.prevPage')}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="tabular-nums">
                  {page + 1} / {pageCount}
                </span>
                <button
                  className="btn-icon h-8 w-8"
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label={t('results.nextPage')}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <ReviewPanel
        row={selRow}
        position={selIndex >= 0 ? t('common.of', { a: selIndex + 1, b: filtered.length }) : ''}
        onPrev={selIndex > 0 ? () => setSelectedId(filtered[selIndex - 1].id) : undefined}
        onNext={selIndex >= 0 && selIndex < filtered.length - 1 ? () => setSelectedId(filtered[selIndex + 1].id) : undefined}
      />
    </div>
  );
}
