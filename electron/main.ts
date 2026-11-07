import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron';
import path from 'node:path';
import { AppError } from '../shared/errors';
import { LANGS, type Analysis, type CategoryDef, type Lang, type ReplyInput, type ReportInput, type Result, type ReviewInput, type SheetSpec } from '../shared/types';
import { clearApiKey, getApiKey, getLanguage, getSettings, readConfig, saveApiKey, updateConfig } from './config';
import { openFile, openPath, saveCsv, savePdf, saveXlsx } from './files';
import {
  classifyBatch,
  GeminiError,
  generateReport,
  listModels,
  modelChain,
  pickDefaultModel,
  suggestReplies,
  type Generated,
} from './gemini';
import { deleteHistory, getHistory, listHistory, saveHistory } from './history';

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

/** Convierte un error en resultado; los AppError llevan código para traducirlo en la interfaz. */
function failure(err: unknown): Result<never> {
  if (err instanceof AppError) return { ok: false, error: err.code, fatal: err.fatal, code: err.code, params: err.params };
  const detail = err instanceof Error ? err.message : String(err);
  return { ok: false, error: detail, fatal: false, code: 'unknown', params: { detail } };
}

async function wrap<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return failure(err);
  }
}

async function requireKey(): Promise<string> {
  const key = await getApiKey();
  if (!key) throw new GeminiError('no_key', true);
  return key;
}

/** Modelos disponibles para la key actual (para elegir respaldos si el principal falla). */
let availableModels: string[] = [];

async function ensureModel(models: string[]): Promise<void> {
  availableModels = models;
  const config = await readConfig();
  if (!config.model || !models.includes(config.model)) await updateConfig({ model: pickDefaultModel(models) });
}

/** Ejecuta una tarea de IA con el modelo elegido y sus respaldos; informa qué modelo respondió. */
async function runAi<T>(model: string, task: (key: string, chain: string[]) => Promise<Generated<T>>): Promise<Result<T>> {
  try {
    const key = await requireKey();
    if (availableModels.length === 0) {
      availableModels = await listModels(key).catch(() => []);
    }
    const { result, model: used } = await task(key, modelChain(model, availableModels));
    return { ok: true, data: result, model: used };
  } catch (err) {
    return failure(err);
  }
}

function registerIpc(): void {
  // Configuración
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('key:set', (_e, key: string) =>
    wrap(async () => {
      const trimmed = String(key ?? '').trim();
      if (!trimmed) throw new GeminiError('empty_key', true);
      const models = await listModels(trimmed); // valida la key contra Gemini
      if (models.length === 0) throw new GeminiError('no_models', true);
      await saveApiKey(trimmed);
      await ensureModel(models);
      return models;
    }),
  );
  ipcMain.handle('key:clear', () => clearApiKey());
  ipcMain.handle('models:list', () =>
    wrap(async () => {
      const models = await listModels(await requireKey());
      await ensureModel(models);
      return models;
    }),
  );
  ipcMain.handle('model:set', (_e, model: string) => updateConfig({ model: String(model) }));
  ipcMain.handle('categories:set', (_e, categories: CategoryDef[]) => updateConfig({ categories }));
  ipcMain.handle('theme:set', (_e, theme: string) => {
    if (theme === 'light' || theme === 'dark' || theme === 'system') return updateConfig({ theme });
  });
  ipcMain.handle('language:set', (_e, lang: string) => {
    if ((LANGS as readonly string[]).includes(lang)) return updateConfig({ language: lang as Lang });
  });

  // IA (motivos, temas e informe se escriben en el idioma elegido)
  ipcMain.handle('ai:classify', async (_e, items: ReviewInput[], model: string, categories: CategoryDef[]) => {
    const lang = await getLanguage();
    return runAi(model, (key, chain) => classifyBatch(key, chain, items, categories, lang));
  });
  ipcMain.handle('ai:replies', (_e, items: ReplyInput[], model: string) =>
    runAi(model, (key, chain) => suggestReplies(key, chain, items)),
  );
  ipcMain.handle('ai:report', async (_e, input: ReportInput, model: string) => {
    const lang = await getLanguage();
    return runAi(model, (key, chain) => generateReport(key, chain, input, lang));
  });

  // Archivos
  ipcMain.handle('file:open', (e) => wrap(() => openFile(e.sender)));
  ipcMain.handle('file:openPath', (_e, filePath: string) => wrap(() => openPath(String(filePath))));
  ipcMain.handle('file:csv', (e, name: string, content: string) => wrap(() => saveCsv(e.sender, name, content)));
  ipcMain.handle('file:xlsx', (e, name: string, sheets: SheetSpec[]) => wrap(() => saveXlsx(e.sender, name, sheets)));
  ipcMain.handle('file:pdf', (e, name: string, html: string) => wrap(() => savePdf(e.sender, name, html)));

  // Historial
  ipcMain.handle('history:list', () => listHistory());
  ipcMain.handle('history:get', (_e, id: string) => getHistory(id));
  ipcMain.handle('history:save', (_e, analysis: Analysis) => saveHistory(analysis));
  ipcMain.handle('history:delete', (_e, id: string) => deleteHistory(id));
}

async function createWindow(): Promise<void> {
  const { theme } = await readConfig();
  const dark = theme === 'dark' || (theme !== 'light' && nativeTheme.shouldUseDarkColors);
  const win = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1100,
    minHeight: 680,
    title: 'Clasificador de Reseñas IA',
    // Mismo fondo que el tema guardado, para que no parpadee al abrir
    backgroundColor: dark ? '#1c1917' : '#f2e9e5',
    autoHideMenuBar: true,
    // En desarrollo el ícono sale de public/; empaquetado, de dist/ (Vite copia public/ a dist/)
    icon: path.join(__dirname, DEV_SERVER_URL ? '../public/icon.png' : '../dist/icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());
  // Enlaces externos (p. ej. Google AI Studio) se abren en el navegador
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  // Evita que soltar un archivo fuera de la zona navegue la ventana
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  if (DEV_SERVER_URL) void win.loadURL(DEV_SERVER_URL);
  else void win.loadFile(path.join(__dirname, '../dist/index.html'));
}

// Una sola instancia: si la app ya está abierta (instalada o de desarrollo), abrirla otra vez
// solo trae al frente la ventana existente en lugar de crear una segunda.
if (!app.requestSingleInstanceLock()) {
  console.log('La app ya está abierta: se muestra la ventana existente.');
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  app.whenReady().then(async () => {
    registerIpc();
    await createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
