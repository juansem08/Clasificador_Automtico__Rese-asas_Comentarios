import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Analysis, AnalysisMeta, CategoryDef, Dataset, Row, Settings, SheetData } from '../../shared/types';
import { FALLBACK_CATEGORY } from '../../shared/types';
import { applyColumns, buildRows, datasetFromSheet, fileBase, isClassified } from '../lib/data';
import type { Granularity } from '../lib/dates';
import { buildCsv, buildReportInput, buildWorkbook } from '../lib/exporters';
import { buildReportHtml } from '../lib/reportHtml';
import { computeStats, computeTrend, defaultGranularity, type Stats, type TrendPoint } from '../lib/stats';
import { loadTheme, saveTheme, watchTheme } from '../lib/theme';
import { useI18n } from '../i18n/I18n';
import { EMPTY_FILTERS, type Filters, type Notice, type Theme, type View } from '../types';

const CLASSIFY_BATCH = 20;
const REPLY_BATCH = 8;

type RowChange = Partial<Pick<Row, 'sentimiento' | 'categoria' | 'prioridad' | 'respuesta'>>;

/** Las duplicadas heredan la clasificación de su opinión original. */
function syncDuplicates(rows: Row[]): Row[] {
  return rows.map((r) => {
    if (r.status !== 'duplicate' || r.duplicateOf === undefined) return r;
    const o = rows[r.duplicateOf];
    if (!o || !isClassified(o)) return r;
    if (o.sentimiento === r.sentimiento && o.categoria === r.categoria && o.prioridad === r.prioridad) return r;
    return {
      ...r,
      sentimiento: o.sentimiento,
      categoria: o.categoria,
      prioridad: o.prioridad,
      confianza: o.confianza,
      motivo: o.motivo,
      tema: o.tema,
    };
  });
}

const now = () => new Date().toISOString();

function useStoreValue() {
  const i18n = useI18n();
  const { t, lang, setLang } = i18n;
  /** Mensaje de error traducido a partir de un resultado fallido. */
  const errText = i18n.error;

  // ----- Configuración -----
  const [settings, setSettings] = useState<Settings>({ hasKey: false, maskedKey: '', model: '', categories: [] });
  const [models, setModels] = useState<string[]>([]);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  // ----- Navegación y avisos -----
  const [view, setView] = useState<View>('load');
  const [notice, setNotice] = useState<Notice>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ----- Análisis actual -----
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const analysisRef = useRef<Analysis | null>(null);
  analysisRef.current = analysis;
  /** Hojas del último Excel abierto (para poder cambiar de hoja). No se guardan en el historial. */
  const [workbookSheets, setWorkbookSheets] = useState<SheetData[] | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [exported, setExported] = useState(false);

  // ----- Procesos de IA -----
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);
  const [replyingIds, setReplyingIds] = useState<Set<number>>(new Set());
  const [reportBusy, setReportBusy] = useState(false);

  // ----- Historial -----
  const [history, setHistory] = useState<AnalysisMeta[]>([]);

  useEffect(() => watchTheme(theme), [theme]);
  /** El tema se guarda en la configuración de la app (compartida) y en una copia local para pintar rápido. */
  const setTheme = (t: Theme) => {
    saveTheme(t);
    setThemeState(t);
    void window.api.setTheme(t);
  };

  const refreshSettings = useCallback(async () => {
    const s = await window.api.getSettings();
    setSettings(s);
    // La configuración manda: así la versión instalada y la de desarrollo usan el mismo tema e idioma
    if (s.theme) {
      setThemeState(s.theme);
      saveTheme(s.theme);
    }
    if (s.language) setLang(s.language, false);
    return s;
  }, [setLang]);

  const refreshModels = useCallback(async () => {
    const res = await window.api.listModels();
    if (res.ok) {
      setModels(res.data);
      await refreshSettings();
    } else {
      setNotice({ kind: 'error', text: errText(res) });
    }
  }, [refreshSettings, errText]);

  const refreshHistory = useCallback(async () => setHistory(await window.api.listHistory()), []);

  // Inicio: configuración, modelos e historial
  useEffect(() => {
    void (async () => {
      const s = await refreshSettings();
      void refreshHistory();
      if (s.hasKey) await refreshModels();
      else setShowKeyModal(true);
    })();
  }, [refreshSettings, refreshModels, refreshHistory]);

  // Guardado automático en el historial (solo análisis con algo clasificado)
  useEffect(() => {
    if (!analysis || !analysis.rows.some(isClassified)) return;
    const t = setTimeout(() => void window.api.saveHistory(analysis).then(refreshHistory), 700);
    return () => clearTimeout(t);
  }, [analysis, refreshHistory]);

  const setModel = async (model: string) => {
    await window.api.setModel(model);
    setSettings((s) => ({ ...s, model }));
  };

  const saveCategories = async (categories: CategoryDef[]) => {
    await window.api.setCategories(categories);
    setSettings((s) => ({ ...s, categories }));
    setNotice({ kind: 'success', text: t('notices.catsSaved') });
  };

  const updateRows = (fn: (rows: Row[]) => Row[]) =>
    setAnalysis((a) => (a ? { ...a, rows: fn(a.rows), updatedAt: now() } : a));

  // ----- Carga de datos -----

  /** `sheets`: todas las hojas si viene de un Excel; undefined conserva las actuales (cambio de columna u hoja). */
  const loadDataset = (dataset: Dataset, sheets?: SheetData[] | null) => {
    if (sheets !== undefined) setWorkbookSheets(sheets);
    const rows = buildRows(dataset);
    const ts = now();
    setAnalysis({ id: crypto.randomUUID(), name: fileBase(dataset.name), createdAt: ts, updatedAt: ts, dataset, rows, report: null });
    setGranularity(defaultGranularity(rows));
    setFilters(EMPTY_FILTERS);
    setSelectedId(null);
    setProgress({ done: 0, total: 0 });
    setExported(false);
    setNotice(null);
  };

  const setTextColumn = (column: string) => {
    const a = analysisRef.current;
    if (a) loadDataset({ ...a.dataset, textColumn: column });
  };

  const setSheet = (sheetName: string) => {
    const a = analysisRef.current;
    const sheet = workbookSheets?.find((s) => s.name === sheetName);
    if (a && sheet) loadDataset(datasetFromSheet(a.dataset.name, sheet));
  };

  const setDateColumn = (column: string) => {
    setAnalysis((a) => {
      if (!a) return a;
      const dataset = { ...a.dataset, dateColumn: column };
      const rows = applyColumns(a.rows, dataset);
      setGranularity(defaultGranularity(rows));
      return { ...a, dataset, rows, updatedAt: now() };
    });
  };
  const renameAnalysis = (name: string) => setAnalysis((a) => (a ? { ...a, name, updatedAt: now() } : a));

  // ----- Clasificación -----

  /** Clasifica pendientes y fallidas (o solo las fallidas, o solo los ids indicados). */
  const classify = async (onlyFailed = false, ids?: number[]) => {
    if (!settings.hasKey) return setShowKeyModal(true);
    if (!settings.model) return setNotice({ kind: 'error', text: t('errors.no_model_selected') });
    const a = analysisRef.current;
    if (!a) return;

    const targets = a.rows.filter((r) =>
      ids ? ids.includes(r.id) && r.status !== 'skipped' && r.status !== 'duplicate'
        : onlyFailed ? r.status === 'error' : r.status === 'pending' || r.status === 'error',
    );
    if (targets.length === 0) return;

    cancelRef.current = false;
    setRunning(true);
    setNotice(null);
    setProgress({ done: 0, total: targets.length });

    let fatalError = '';
    let failed = 0;
    // Si el modelo elegido está saturado y responde uno de respaldo, se sigue con ese
    let model = settings.model;
    for (let i = 0; i < targets.length; i += CLASSIFY_BATCH) {
      if (cancelRef.current) break;
      const batch = targets.slice(i, i + CLASSIFY_BATCH);
      const res = await window.api.classify(
        batch.map((r) => ({ id: r.id, text: r.text })),
        model,
        settings.categories,
      );
      if (res.ok && res.model) model = res.model;
      const byId = new Map(res.ok ? res.data.map((c) => [c.id, c]) : []);
      const ids = new Set(batch.map((r) => r.id));
      // Se guarda el código del error (se traduce al mostrarlo, en el idioma que haya en ese momento)
      const errorText = res.ok ? 'missing_result' : (res.code ?? res.error);
      failed += batch.filter((r) => !byId.has(r.id)).length;

      updateRows((rows) =>
        syncDuplicates(
          rows.map((r) => {
            if (!ids.has(r.id)) return r;
            const c = byId.get(r.id);
            return c
              ? { ...r, ...c, id: r.id, status: 'done', edited: false, reviewed: false, error: undefined }
              : { ...r, status: 'error', error: errorText };
          }),
        ),
      );
      setProgress({ done: Math.min(i + batch.length, targets.length), total: targets.length });
      if (!res.ok && res.fatal) {
        fatalError = errText(res);
        break;
      }
    }

    setRunning(false);
    const fallbackNote = model !== settings.model ? t('notices.fallback', { used: model, model: settings.model }) : '';
    if (fatalError) setNotice({ kind: 'error', text: fatalError });
    else if (cancelRef.current) setNotice({ kind: 'info', text: t('notices.stopped') });
    else if (failed > 0) setNotice({ kind: 'error', text: t('notices.failedN', { n: failed }) + fallbackNote });
    else setNotice({ kind: 'success', text: t('notices.done') + fallbackNote });
  };

  const cancel = () => {
    cancelRef.current = true;
  };

  /** Vuelve a clasificar todo con la IA, excepto lo corregido a mano. */
  const reclassifyAll = async () => {
    const a = analysisRef.current;
    if (!a) return;
    const rows = a.rows.map((r): Row =>
      (r.status === 'done' || r.status === 'error') && !r.edited
        ? {
            ...r,
            status: 'pending',
            sentimiento: undefined,
            categoria: undefined,
            prioridad: undefined,
            confianza: undefined,
            motivo: undefined,
            tema: undefined,
            reviewed: false,
            error: undefined,
          }
        : r,
    );
    const next = { ...a, rows, updatedAt: now() };
    analysisRef.current = next; // para que classify vea las filas nuevas sin esperar al render
    setAnalysis(next);
    await classify();
  };

  const markReviewed = (id: number) =>
    updateRows((rows) => rows.map((r) => (r.id === id ? { ...r, reviewed: true } : r)));

  const editRow = (id: number, change: RowChange) =>
    updateRows((rows) =>
      syncDuplicates(
        // Editar la respuesta no cuenta como corregir la clasificación
        rows.map((r) => (r.id === id ? { ...r, ...change, edited: 'respuesta' in change ? r.edited : true } : r)),
      ),
    );

  // ----- Respuestas sugeridas -----

  const generateReplies = async (ids?: number[]) => {
    const a = analysisRef.current;
    if (!a || !settings.model) return;
    const targets = a.rows.filter((r) =>
      ids ? ids.includes(r.id) && isClassified(r) : r.status === 'done' && r.sentimiento === 'Negativo' && !r.respuesta,
    );
    if (targets.length === 0) return;

    setReplyingIds(new Set(targets.map((r) => r.id)));
    let error = '';
    for (let i = 0; i < targets.length; i += REPLY_BATCH) {
      const batch = targets.slice(i, i + REPLY_BATCH);
      const res = await window.api.suggestReplies(
        batch.map((r) => ({ id: r.id, text: r.text, sentimiento: r.sentimiento!, categoria: r.categoria! })),
        settings.model,
      );
      if (!res.ok) {
        error = errText(res);
        break;
      }
      const byId = new Map(res.data.map((x) => [x.id, x.respuesta]));
      updateRows((rows) => rows.map((r) => (byId.has(r.id) ? { ...r, respuesta: byId.get(r.id) } : r)));
      setReplyingIds((prev) => {
        const next = new Set(prev);
        batch.forEach((r) => next.delete(r.id));
        return next;
      });
    }
    setReplyingIds(new Set());
    if (error) setNotice({ kind: 'error', text: error });
    else if (!ids) setNotice({ kind: 'success', text: t('notices.repliesDone', { n: targets.length }) });
  };

  // ----- Estadísticas -----

  const categoryNames = useMemo(() => settings.categories.map((c) => c.name), [settings.categories]);
  const stats: Stats = useMemo(() => computeStats(analysis?.rows ?? [], categoryNames), [analysis?.rows, categoryNames]);
  // `lang`: las etiquetas de los periodos (meses, semanas) dependen del idioma
  const trend: TrendPoint[] = useMemo(
    () => computeTrend(analysis?.rows ?? [], granularity),
    [analysis?.rows, granularity, lang],
  );
  /** Categorías configuradas + "Otro" + cualquier otra que aparezca en los datos. */
  const allCategories = useMemo(() => {
    const set = new Set([...categoryNames, FALLBACK_CATEGORY]);
    analysis?.rows.forEach((r) => r.categoria && set.add(r.categoria));
    return [...set];
  }, [categoryNames, analysis?.rows]);

  // ----- Informe -----

  const generateReport = async () => {
    const a = analysisRef.current;
    if (!a || !settings.model) return;
    setReportBusy(true);
    const res = await window.api.generateReport(buildReportInput(a, stats, trend), settings.model);
    setReportBusy(false);
    if (!res.ok) return setNotice({ kind: 'error', text: errText(res) });
    const modelo = res.model ?? settings.model;
    setAnalysis((cur) => (cur ? { ...cur, report: { ...res.data, generadoEn: now(), modelo }, updatedAt: now() } : cur));
  };

  // ----- Exportación -----

  const afterSave = (res: Awaited<ReturnType<typeof window.api.saveCsv>>) => {
    if (!res.ok) return setNotice({ kind: 'error', text: t('errors.save_failed', { detail: errText(res) }) });
    if (res.data) {
      setExported(true);
      setNotice({ kind: 'success', text: t('notices.savedTo', { path: res.data }) });
    }
  };

  const fileName = (a: Analysis, suffix: 'suffixClassified' | 'suffixReport', ext: string) =>
    `${fileBase(a.name)}_${t(`exportFile.${suffix}`)}.${ext}`;

  const exportCsv = async (delimiter: ',' | ';') => {
    const a = analysisRef.current;
    if (a) afterSave(await window.api.saveCsv(fileName(a, 'suffixClassified', 'csv'), buildCsv(a, delimiter, lang)));
  };

  const exportXlsx = async () => {
    const a = analysisRef.current;
    if (a) afterSave(await window.api.saveXlsx(fileName(a, 'suffixClassified', 'xlsx'), buildWorkbook(a, stats, trend, lang)));
  };

  const exportPdf = async () => {
    const a = analysisRef.current;
    if (a) afterSave(await window.api.savePdf(fileName(a, 'suffixReport', 'pdf'), buildReportHtml(a, stats, trend, lang)));
  };

  // ----- Historial -----

  const openAnalysis = async (id: string) => {
    const a = await window.api.getHistory(id);
    if (!a) return setNotice({ kind: 'error', text: t('errors.open_failed') });
    setAnalysis(a);
    setWorkbookSheets(null);
    setGranularity(defaultGranularity(a.rows));
    setFilters(EMPTY_FILTERS);
    setSelectedId(null);
    setProgress({ done: 0, total: 0 });
    setExported(false);
    setNotice(null);
    setView('dashboard');
  };

  const deleteAnalysis = async (id: string) => {
    await window.api.deleteHistory(id);
    if (analysisRef.current?.id === id) setAnalysis(null);
    await refreshHistory();
  };

  /** Desde el panel: abre Resultados con un filtro aplicado (y opcionalmente una opinión seleccionada). */
  const drillDown = (partial: Partial<Filters>, rowId?: number) => {
    setFilters({ ...EMPTY_FILTERS, ...partial });
    setSelectedId(rowId ?? null);
    setView('results');
  };

  return {
    settings,
    models,
    refreshSettings,
    refreshModels,
    setModel,
    saveCategories,
    showKeyModal,
    setShowKeyModal,
    theme,
    setTheme,
    view,
    setView,
    notice,
    setNotice,
    filters,
    setFilters,
    selectedId,
    setSelectedId,
    drillDown,
    analysis,
    loadDataset,
    workbookSheets,
    setSheet,
    setTextColumn,
    setDateColumn,
    renameAnalysis,
    granularity,
    setGranularity,
    stats,
    trend,
    allCategories,
    running,
    progress,
    classify,
    cancel,
    reclassifyAll,
    markReviewed,
    editRow,
    replyingIds,
    generateReplies,
    reportBusy,
    generateReport,
    exported,
    exportCsv,
    exportXlsx,
    exportPdf,
    history,
    refreshHistory,
    openAnalysis,
    deleteAnalysis,
  };
}

export type Store = ReturnType<typeof useStoreValue>;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore fuera de StoreProvider');
  return ctx;
}
