import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
  onClick?: () => void;
}

/** Tarjeta de indicador: etiqueta en versalitas, cifra grande y nota. */
export default function StatTile({ label, value, sub, accent, onClick }: Props) {
  const body = (
    <>
      <div className="eyebrow">{label}</div>
      <div className={`mt-2 truncate text-4xl font-bold tracking-tight ${accent ? 'text-accent-ink' : 'text-ink'}`}>{value}</div>
      {sub && <div className="mt-2 truncate text-xs text-ink-2">{sub}</div>}
    </>
  );
  return onClick ? (
    <button className="card p-5 text-left transition hover:ring-2 hover:ring-accent/30" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="card p-5">{body}</div>
  );
}
