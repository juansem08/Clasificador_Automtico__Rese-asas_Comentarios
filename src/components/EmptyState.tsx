import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Rich } from '../i18n/I18n';

export default function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  /** Admite *cursiva* (marcas del diccionario). */
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-accent-ink">
        <Icon size={28} />
      </div>
      <p className="display text-4xl">
        <Rich text={title} />
      </p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-2">{text}</p>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
