import { ArrowUpRight, CalendarRange, ChartColumn, LoaderCircle, Sparkle, Table, Upload } from 'lucide-react';
import { useState } from 'react';
import CategoryBars from '../components/charts/CategoryBars';
import SentimentLegend from '../components/charts/Legend';
import SegmentedBar from '../components/charts/SegmentedBar';
import TrendChart from '../components/charts/TrendChart';
import { PriorityChip } from '../components/Chips';
import EmptyState from '../components/EmptyState';
import StatTile from '../components/StatTile';
import { Rich, useI18n } from '../i18n/I18n';
import { isClassified } from '../lib/data';
import { pct } from '../lib/stats';
import { useStore } from '../state/store';

const PRIORITY_ORDER = { Alta: 0, Media: 1, Baja: 2 } as const;

export default function DashboardView() {
  const { analysis, stats, trend, granularity, setGranularity, drillDown, setView, generateReport, reportBusy, exportPdf, running } =
    useStore();
  const i18n = useI18n();
  const { t } = i18n;
  const [asTable, setAsTable] = useState(false);

  if (!analysis || stats.classified === 0) {
    return (
      <EmptyState
        icon={ChartColumn}
        title={t('dashboard.emptyTitle')}
        text={t('dashboard.emptyText')}
        action={
          <button className="btn-primary" onClick={() => setView(analysis ? 'results' : 'load')}>
            <Upload size={15} /> {analysis ? t('dashboard.goClassify') : t('dashboard.loadData')}
          </button>
        }
      />
    );
  }

  const c = stats.classified;
  const attention = analysis.rows
    .filter((r) => isClassified(r) && r.status === 'done' && (r.prioridad === 'Alta' || r.prioridad === 'Media') && r.sentimiento !== 'Positivo')
    .sort((a, b) => PRIORITY_ORDER[a.prioridad!] - PRIORITY_ORDER[b.prioridad!]);
  const rep = analysis.report;
  const headline = rep ? rep.titular || rep.resumen.split(/(?<=[.!?])\s/)[0] : '';

  return (
    <div className="space-y-5">
      {/* Portada */}
      <section className="card px-8 py-12 text-center">
        <h1 className="display text-[72px]">
          <Rich text={t('dashboard.hero')} />
        </h1>
        <span className="tape -mt-1 text-[40px] leading-none">{t('dashboard.tape')}</span>
        <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-ink-2">{t('dashboard.intro')}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-5">
          {rep ? (
            <button className="btn-primary px-7 py-3.5 text-[15px]" onClick={() => setView('report')}>
              {t('dashboard.seeReport')}
            </button>
          ) : (
            <button className="btn-primary px-7 py-3.5 text-[15px]" onClick={() => void generateReport()} disabled={reportBusy || running}>
              {reportBusy && <LoaderCircle size={16} className="animate-spin" />}
              {reportBusy ? t('dashboard.writingReport') : t('dashboard.genReport')}
            </button>
          )}
          <button className="flex items-center gap-1 text-[15px] font-bold text-ink hover:underline" onClick={() => drillDown({})}>
            {t('dashboard.seeResults')} <ArrowUpRight size={17} />
          </button>
        </div>
      </section>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={t('dashboard.analyzed')}
          value={c}
          sub={stats.total > c ? t('dashboard.ofLoaded', { n: stats.total }) : t('dashboard.classifiedOps')}
        />
        <StatTile
          label={t('dashboard.positives')}
          value={`${pct(stats.sentiment.Positivo, c)}%`}
          sub={t('common.of', { a: stats.sentiment.Positivo, b: c })}
          accent
          onClick={() => drillDown({ sentimiento: 'Positivo' })}
        />
        <StatTile
          label={t('dashboard.negatives')}
          value={`${pct(stats.sentiment.Negativo, c)}%`}
          sub={
            t('common.of', { a: stats.sentiment.Negativo, b: c }) +
            (stats.topProblem ? t('dashboard.mostly', { cat: i18n.category(stats.topProblem.name).toLowerCase() }) : '')
          }
          onClick={() => drillDown({ sentimiento: 'Negativo' })}
        />
        <StatTile
          label={t('dashboard.avgConf')}
          value={`${stats.avgConfidence}%`}
          sub={stats.lowConfidence ? t('dashboard.toReviewN', { n: stats.lowConfidence }) : t('dashboard.fromAI')}
          onClick={stats.lowConfidence ? () => drillDown({ lowConfidence: true }) : undefined}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* Distribución + atención */}
        <section className="card p-7">
          <h2 className="mb-5 text-[15px] font-bold text-ink">{t('dashboard.distribution')}</h2>
          <SegmentedBar counts={stats.sentiment} onSelect={(s) => drillDown({ sentimiento: s })} />

          <div className="my-6 border-t border-line" />

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-ink">{t('dashboard.attention')}</h2>
            {attention.length > 4 && (
              <button className="text-xs font-semibold text-accent-ink hover:underline" onClick={() => drillDown({ prioridad: 'Alta' })}>
                {t('dashboard.seeAll', { n: attention.length })}
              </button>
            )}
          </div>
          {attention.length === 0 ? (
            <p className="rounded-2xl bg-sunken px-4 py-6 text-center text-sm text-ink-2">{t('dashboard.nothingUrgent')}</p>
          ) : (
            <ul className="space-y-2">
              {attention.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <button
                    className="flex w-full items-center gap-3 rounded-2xl bg-sunken px-4 py-3 text-left transition hover:ring-1 hover:ring-accent/40"
                    onClick={() => drillDown({ prioridad: r.prioridad }, r.id)}
                  >
                    <PriorityChip value={r.prioridad!} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                      {i18n.category(r.categoria!)}
                      {r.tema ? ` · ${r.tema}` : ''}
                    </span>
                    <ArrowUpRight size={16} className="shrink-0 text-ink-2" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Resumen del informe */}
        <section className="flex flex-col rounded-4xl bg-inverse p-8 text-on-inverse">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">{t('dashboard.reportCard')}</span>
            <Sparkle size={18} fill="currentColor" />
          </div>
          {rep ? (
            <>
              <p className="mt-6 font-display text-[40px] leading-[1.02] tracking-tight">{headline}</p>
              <p className="mt-5 text-sm leading-relaxed opacity-85">{rep.resumen}</p>
            </>
          ) : (
            <>
              <p className="mt-6 font-display text-[40px] leading-[1.02] tracking-tight">
                <Rich text={t('dashboard.reportPlaceholder')} />
              </p>
              <p className="mt-5 text-sm leading-relaxed opacity-85">{t('dashboard.reportPlaceholderText')}</p>
            </>
          )}
          <div className="mt-auto flex flex-wrap gap-3 pt-8">
            {rep ? (
              <button className="btn btn-on-inverse" onClick={() => setView('report')}>
                {t('dashboard.readFull')}
              </button>
            ) : (
              <button className="btn btn-on-inverse" onClick={() => void generateReport()} disabled={reportBusy || running}>
                {reportBusy && <LoaderCircle size={15} className="animate-spin" />}
                {reportBusy ? t('dashboard.writing') : t('dashboard.genReport')}
              </button>
            )}
            <button className="btn btn-inverse-outline" onClick={() => void exportPdf()}>
              {t('dashboard.exportPdf')}
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-ink">{t('dashboard.categories')}</h2>
              <p className="text-sm text-ink-2">{t('dashboard.categoriesSub')}</p>
            </div>
            <button className="btn-ghost shrink-0 px-3 py-1.5 text-xs" onClick={() => setAsTable((v) => !v)}>
              {asTable ? <ChartColumn size={14} /> : <Table size={14} />}
              {asTable ? t('dashboard.seeChart') : t('dashboard.seeTable')}
            </button>
          </div>
          {!asTable && (
            <div className="mb-4">
              <SentimentLegend />
            </div>
          )}
          <CategoryBars
            categories={stats.categories}
            asTable={asTable}
            onSelect={(categoria, sentimiento) => drillDown({ categoria, sentimiento: sentimiento ?? '' })}
          />
        </section>

        <section className="card p-7">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-ink">{t('dashboard.trend')}</h2>
              <p className="text-sm text-ink-2">{granularity === 'week' ? t('dashboard.trendSubWeek') : t('dashboard.trendSubMonth')}</p>
            </div>
            {trend.length > 0 && (
              <div className="seg" role="radiogroup" aria-label={t('dashboard.groupBy')}>
                {(['week', 'month'] as const).map((g) => (
                  <button key={g} role="radio" aria-checked={granularity === g} className="seg-item px-3 py-1 text-xs" onClick={() => setGranularity(g)}>
                    {g === 'week' ? t('dashboard.weeks') : t('dashboard.months')}
                  </button>
                ))}
              </div>
            )}
          </div>
          {trend.length > 0 ? (
            <>
              <div className="mb-2">
                <SentimentLegend />
              </div>
              <TrendChart points={trend} />
            </>
          ) : (
            <div className="flex flex-col items-center rounded-3xl bg-sunken px-6 py-10 text-center text-sm text-ink-2">
              <CalendarRange size={26} className="mb-2 text-ink-3" />
              {analysis.dataset.dateColumn ? t('dashboard.badDates') : t('dashboard.pickDate')}
              <button className="mt-3 font-semibold text-accent-ink hover:underline" onClick={() => setView('load')}>
                {t('dashboard.goLoad')}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
