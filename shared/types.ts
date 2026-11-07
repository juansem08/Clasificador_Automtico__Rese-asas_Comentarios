// Tipos compartidos entre el proceso principal (Electron) y la interfaz (React).

export const SENTIMENTS = ['Positivo', 'Negativo', 'Neutro'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const PRIORITIES = ['Alta', 'Media', 'Baja'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const IMPACTS = ['Alto', 'Medio', 'Bajo'] as const;
export type Impact = (typeof IMPACTS)[number];

/** Categoría configurable: el nombre y la descripción se envían a la IA. */
export interface CategoryDef {
  name: string;
  description: string;
}

/** Siempre existe como último recurso; no se edita. */
export const FALLBACK_CATEGORY = 'Otro';

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  {
    name: 'Atención',
    description: 'Trato del personal, servicio al cliente, amabilidad, tiempos de espera, soporte, entrega o envío.',
  },
  { name: 'Precio', description: 'Costo, relación calidad-precio, promociones, cobros, tarifas o descuentos.' },
  {
    name: 'Calidad',
    description: 'Estado, funcionamiento, durabilidad, sabor, frescura o desempeño del producto o servicio.',
  },
];

// ---------- Datos de un análisis ----------

export type RowStatus = 'pending' | 'done' | 'error' | 'skipped' | 'duplicate';

export interface Row {
  id: number;
  text: string;
  /** Fecha normalizada YYYY-MM-DD (si el archivo tiene columna de fecha). */
  date?: string;
  status: RowStatus;
  sentimiento?: Sentiment;
  categoria?: string;
  prioridad?: Priority;
  /** 0–100 */
  confianza?: number;
  motivo?: string;
  /** Asunto concreto en pocas palabras, p. ej. "cobro duplicado". */
  tema?: string;
  respuesta?: string;
  /** Si es duplicada, id de la opinión original. */
  duplicateOf?: number;
  edited?: boolean;
  /** Una persona confirmó la clasificación. */
  reviewed?: boolean;
  error?: string;
}

export interface Dataset {
  source: 'csv' | 'excel' | 'list';
  name: string;
  /** Hoja de Excel de la que salen los datos. */
  sheetName?: string;
  headers: string[];
  records: Record<string, string>[];
  textColumn: string;
  /** '' = sin columna de fecha */
  dateColumn: string;
}

export interface Report {
  /** Frase corta y llamativa que resume la situación. */
  titular: string;
  resumen: string;
  quejas: { titulo: string; detalle: string; categoria: string }[];
  fortalezas: { titulo: string; detalle: string }[];
  recomendaciones: { accion: string; impacto: Impact }[];
  generadoEn: string;
  modelo: string;
}

export interface Analysis {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  dataset: Dataset;
  rows: Row[];
  report: Report | null;
}

export interface AnalysisMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  total: number;
  classified: number;
  /** Pendientes o con error. */
  pending: number;
  positivos: number;
  negativos: number;
}

// ---------- Entradas / salidas de la IA ----------

export interface ReviewInput {
  id: number;
  text: string;
}

export interface Classification {
  id: number;
  sentimiento: Sentiment;
  categoria: string;
  prioridad: Priority;
  confianza: number;
  motivo: string;
  tema: string;
}

export interface ReplyInput {
  id: number;
  text: string;
  sentimiento: Sentiment;
  categoria: string;
}

export interface ReplyResult {
  id: number;
  respuesta: string;
}

export interface ReportInput {
  nombre: string;
  estadisticas: Record<string, unknown>;
  opiniones: { sentimiento: string; categoria: string; prioridad: string; texto: string }[];
}

// ---------- Archivos ----------

/** Una hoja de Excel ya convertida en tabla (fila 1 = encabezados). */
export interface SheetData {
  name: string;
  headers: string[];
  records: Record<string, string>[];
}

export type OpenedFile =
  | { name: string; kind: 'text'; data: Uint8Array }
  | { name: string; kind: 'excel'; sheets: SheetData[] };

export type Cell = string | number;

export interface SheetSpec {
  name: string;
  rows: Cell[][];
  /** Índices (0-based) de filas a resaltar como encabezado. */
  headerRows: number[];
  widths: number[];
  wrapColumns?: number[];
  autoFilter?: boolean;
}

// ---------- Configuración ----------

export type Theme = 'light' | 'dark' | 'system';

export const LANGS = ['es', 'en', 'ru'] as const;
export type Lang = (typeof LANGS)[number];

export interface Settings {
  hasKey: boolean;
  maskedKey: string;
  model: string;
  categories: CategoryDef[];
  /** undefined = aún no se ha elegido (se usa el del sistema). */
  theme?: Theme;
  /** undefined = aún no se ha elegido (se detecta del sistema). */
  language?: Lang;
}

/**
 * `model`: en tareas de IA, el modelo que respondió (puede ser uno de respaldo).
 * `code`/`params`: error traducible (ver shared/errors.ts); `error` queda como texto de respaldo.
 */
export type Result<T> =
  | { ok: true; data: T; model?: string }
  | { ok: false; error: string; fatal: boolean; code?: string; params?: Record<string, string> };

/** API expuesta por el preload en `window.api`. */
export interface DesktopApi {
  getSettings(): Promise<Settings>;
  setApiKey(key: string): Promise<Result<string[]>>;
  clearApiKey(): Promise<void>;
  listModels(): Promise<Result<string[]>>;
  setModel(model: string): Promise<void>;
  setCategories(categories: CategoryDef[]): Promise<void>;
  setTheme(theme: Theme): Promise<void>;
  setLanguage(lang: Lang): Promise<void>;

  classify(items: ReviewInput[], model: string, categories: CategoryDef[]): Promise<Result<Classification[]>>;
  suggestReplies(items: ReplyInput[], model: string): Promise<Result<ReplyResult[]>>;
  generateReport(input: ReportInput, model: string): Promise<Result<Omit<Report, 'generadoEn' | 'modelo'>>>;

  openFile(): Promise<Result<OpenedFile | null>>;
  /** Abre un archivo soltado en la ventana (arrastrar y soltar). */
  openDropped(file: File): Promise<Result<OpenedFile>>;
  saveCsv(defaultName: string, content: string): Promise<Result<string | null>>;
  saveXlsx(defaultName: string, sheets: SheetSpec[]): Promise<Result<string | null>>;
  savePdf(defaultName: string, html: string): Promise<Result<string | null>>;

  listHistory(): Promise<AnalysisMeta[]>;
  getHistory(id: string): Promise<Analysis | null>;
  saveHistory(analysis: Analysis): Promise<void>;
  deleteHistory(id: string): Promise<void>;
}
