import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect } from 'react';
import { useI18n } from '../i18n/I18n';
import { useStore } from '../state/store';

export default function NoticeBar() {
  const { notice, setNotice } = useStore();
  const { t } = useI18n();

  // Los avisos de éxito desaparecen solos
  useEffect(() => {
    if (notice?.kind !== 'success') return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  if (!notice) return null;
  const style =
    notice.kind === 'success' ? 'bg-accent-soft text-ink' : notice.kind === 'error' ? 'bg-neg-soft text-neg-ink' : 'bg-surface text-ink-2';
  const Icon = notice.kind === 'success' ? CircleCheck : notice.kind === 'error' ? TriangleAlert : Info;

  return (
    <div className={`mb-5 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium ${style}`} role="status">
      <Icon size={17} className={`mt-0.5 shrink-0 ${notice.kind === 'success' ? 'text-accent-ink' : ''}`} />
      <span className="flex-1 break-words">{notice.text}</span>
      <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100" aria-label={t('common.close')}>
        <X size={16} />
      </button>
    </div>
  );
}
