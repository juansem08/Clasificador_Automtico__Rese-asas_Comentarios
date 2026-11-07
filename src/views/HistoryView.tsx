import { File, FileSpreadsheet, FolderOpen, History, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { useI18n } from '../i18n/I18n';
import { formatDateTime } from '../lib/dates';
import { pct } from '../lib/stats';
import { useStore } from '../state/store';

export default function HistoryView() {
  const { history, refreshHistory, openAnalysis, deleteAnalysis, analysis, running } = useStore();
  const { t } = useI18n();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  if (history.length === 0) {
    return <EmptyState icon={History} title={t('history.emptyTitle')} text={t('history.emptyText')} />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow={t('history.savedN', { n: history.length })} title={t('history.title')} />
      <ul className="space-y-3">
        {history.map((h) => {
          const isOpen = analysis?.id === h.id;
          const Icon = /xlsx|excel/i.test(h.name) ? FileSpreadsheet : File;
          return (
            <li key={h.id} className={`card flex flex-wrap items-center gap-5 p-5 ${isOpen ? 'ring-2 ring-accent' : ''}`}>
              <span className="icon-tile">
                <Icon size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-bold text-ink">{h.name}</span>
                  {isOpen && <span className="chip bg-accent-soft text-accent-ink">{t('history.openChip')}</span>}
                  <span className={`chip ${h.pending === 0 ? 'bg-pos-soft text-pos-ink' : 'bg-warn-soft text-warn-ink'}`}>
                    {h.pending === 0 ? t('common.ready') : t('history.pendingN', { n: h.pending })}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-ink-2">
                  {t('history.meta', { u: formatDateTime(h.updatedAt), c: formatDateTime(h.createdAt) })}
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                {[
                  [t('history.opinions'), String(h.classified)],
                  [t('dashboard.positives'), `${pct(h.positivos, h.classified)}%`],
                  [t('dashboard.negatives'), `${pct(h.negativos, h.classified)}%`],
                ].map(([l, v]) => (
                  <div key={l} className="text-right">
                    <div className="eyebrow text-[10px]">{l}</div>
                    <div className="text-lg font-bold tabular-nums text-ink">{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {confirmId === h.id ? (
                  <>
                    <button className="btn-ghost px-3" onClick={() => setConfirmId(null)}>
                      {t('common.cancel')}
                    </button>
                    <button
                      className="btn bg-neg-soft text-neg-ink"
                      onClick={() => {
                        setConfirmId(null);
                        void deleteAnalysis(h.id);
                      }}
                    >
                      {t('common.delete')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn-icon"
                      onClick={() => setConfirmId(h.id)}
                      disabled={running && isOpen}
                      aria-label={t('history.deleteAria', { name: h.name })}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button className="btn-outline" onClick={() => void openAnalysis(h.id)} disabled={running}>
                      <FolderOpen size={15} /> {t('history.open')}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
