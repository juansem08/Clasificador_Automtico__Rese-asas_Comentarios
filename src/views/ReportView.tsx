import { FileDown, FileText, Lightbulb, LoaderCircle, RefreshCw, Sparkle, ThumbsDown, ThumbsUp, WandSparkles } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { useI18n } from '../i18n/I18n';
import { formatDateTime } from '../lib/dates';
import { IMPACT_STYLE } from '../lib/labels';
import { useStore } from '../state/store';

const MIN_FOR_REPORT = 3;

export default function ReportView() {
  const { analysis, stats, reportBusy, generateReport, exportPdf, setView, running, settings } = useStore();
  const i18n = useI18n();
  const { t } = i18n;

  if (!analysis || stats.classified < MIN_FOR_REPORT) {
    return (
      <EmptyState
        icon={FileText}
        title={t('report.emptyTitle')}
        text={t('report.emptyText', { n: MIN_FOR_REPORT })}
        action={
          <button className="btn-primary" onClick={() => setView(analysis ? 'results' : 'load')}>
            {analysis ? t('report.goClassify') : t('report.loadData')}
          </button>
        }
      />
    );
  }

  const rep = analysis.report;
  const pending = stats.pending + stats.errors;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow={rep ? t('report.generated', { date: formatDateTime(rep.generadoEn), model: rep.modelo }) : t('report.eyebrow')}
        title={t('report.title')}
        actions={
          <>
            <button className="btn-primary" onClick={() => void generateReport()} disabled={reportBusy || running}>
              {reportBusy ? <LoaderCircle size={15} className="animate-spin" /> : rep ? <RefreshCw size={15} /> : <WandSparkles size={15} />}
              {reportBusy ? t('report.writing') : rep ? t('report.regenerate') : t('report.generateWith', { model: settings.model || 'Gemini' })}
            </button>
            <button className="btn-outline" onClick={() => void exportPdf()} disabled={reportBusy}>
              <FileDown size={15} /> {t('report.exportPdf')}
            </button>
          </>
        }
      />

      {pending > 0 && (
        <p className="mb-5 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn-ink">
          {t('report.pendingWarn', { n: pending, c: stats.classified })}
        </p>
      )}

      {rep ? (
        <div className="space-y-5">
          <section className="rounded-4xl bg-inverse p-10 text-on-inverse">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">{t('report.summary')}</span>
              <Sparkle size={18} fill="currentColor" />
            </div>
            {rep.titular && <p className="mt-5 max-w-3xl font-display text-[48px] leading-[1] tracking-tight">{rep.titular}</p>}
            <p className="mt-5 max-w-3xl text-[15px] leading-relaxed opacity-90">{rep.resumen}</p>
          </section>

          <section className="card p-8">
            <h3 className="mb-5 flex items-center gap-2.5 text-lg font-bold text-ink">
              <span className="icon-tile h-9 w-9 rounded-xl bg-neg-soft text-neg-ink">
                <ThumbsDown size={16} />
              </span>
              {t('report.complaints')}
            </h3>
            <ol className="space-y-4">
              {rep.quejas.map((q, i) => (
                <li key={i} className="flex gap-4">
                  <span className="font-display text-3xl leading-none text-accent-ink">{i + 1}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink">{q.titulo}</span>
                      {q.categoria && <span className="chip bg-sunken text-ink-2">{i18n.category(q.categoria)}</span>}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{q.detalle}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {rep.fortalezas.length > 0 && (
            <section className="card p-8">
              <h3 className="mb-5 flex items-center gap-2.5 text-lg font-bold text-ink">
                <span className="icon-tile h-9 w-9 rounded-xl bg-pos-soft text-pos-ink">
                  <ThumbsUp size={16} />
                </span>
                {t('report.strengths')}
              </h3>
              <ul className="grid gap-3 md:grid-cols-3">
                {rep.fortalezas.map((f, i) => (
                  <li key={i} className="rounded-3xl bg-sunken p-5">
                    <div className="font-bold text-ink">{f.titulo}</div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{f.detalle}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-8">
            <h3 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-ink">
              <span className="icon-tile h-9 w-9 rounded-xl bg-accent-soft text-accent-ink">
                <Lightbulb size={16} />
              </span>
              {t('report.recommendations')}
            </h3>
            <ol className="divide-y divide-line">
              {rep.recomendaciones.map((r, i) => (
                <li key={i} className="flex items-start gap-4 py-3.5">
                  <span className="text-sm font-bold tabular-nums text-ink-3">{i + 1}.</span>
                  <p className="flex-1 text-[15px] text-ink">{r.accion}</p>
                  <span className={`chip ${IMPACT_STYLE[r.impacto]}`}>{i18n.impact(r.impacto)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : (
        !reportBusy && (
          <EmptyState icon={WandSparkles} title={t('report.noReportTitle')} text={t('report.noReportText', { n: stats.classified })} />
        )
      )}
    </div>
  );
}
