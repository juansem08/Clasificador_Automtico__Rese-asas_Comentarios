import { ChevronDown, Download, FileSpreadsheet, FileText, Sheet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18n';
import { useStore } from '../state/store';

export default function ExportMenu({ disabled }: { disabled: boolean }) {
  const { exportCsv, exportXlsx, exportPdf } = useStore();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const items = [
    { icon: FileSpreadsheet, label: t('exportMenu.xlsx'), hint: t('exportMenu.xlsxHint'), run: exportXlsx },
    { icon: Sheet, label: t('exportMenu.csvExcel'), hint: t('exportMenu.csvExcelHint'), run: () => exportCsv(';') },
    { icon: Sheet, label: t('exportMenu.csvStd'), hint: t('exportMenu.csvStdHint'), run: () => exportCsv(',') },
    { icon: FileText, label: t('exportMenu.pdf'), hint: t('exportMenu.pdfHint'), run: exportPdf },
  ];

  return (
    <div ref={ref} className="relative">
      <button className="btn-dark" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Download size={15} /> {t('exportMenu.button')} <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 w-72 rounded-3xl border border-line bg-surface p-1.5 shadow-soft">
          {items.map(({ icon: Icon, label, hint, run }) => (
            <button
              key={label}
              className="flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-sunken"
              onClick={() => {
                setOpen(false);
                void run();
              }}
            >
              <Icon size={16} className="mt-0.5 shrink-0 text-accent-ink" />
              <span>
                <span className="block text-sm font-semibold text-ink">{label}</span>
                <span className="block text-xs text-ink-2">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
