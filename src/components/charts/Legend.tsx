import { useI18n } from '../../i18n/I18n';
import { SENTIMENT_STYLE } from '../../lib/labels';
import { STACK_ORDER } from './order';

export default function SentimentLegend() {
  const { sentimentPlural } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-ink-2">
      {STACK_ORDER.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SENTIMENT_STYLE[s].color }} />
          {sentimentPlural(s)}
        </span>
      ))}
    </div>
  );
}
