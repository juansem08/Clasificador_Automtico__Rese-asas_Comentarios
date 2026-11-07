import { app, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_CATEGORIES, type CategoryDef, type Lang, type Settings, type Theme } from '../shared/types';

interface StoredConfig {
  apiKey?: string;
  encrypted?: boolean;
  model?: string;
  categories?: CategoryDef[];
  /** Tema de la interfaz; compartido por la versión instalada y la de desarrollo. */
  theme?: Theme;
  /** Idioma de la interfaz, de los diálogos y de los textos que escribe la IA. */
  language?: Lang;
}

const configPath = () => path.join(app.getPath('userData'), 'config.json');
let cache: StoredConfig | null = null;

export async function readConfig(): Promise<StoredConfig> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(configPath(), 'utf8')) as StoredConfig;
  } catch {
    cache = {};
  }
  return cache;
}

export async function updateConfig(patch: Partial<StoredConfig>): Promise<void> {
  const next = { ...(await readConfig()), ...patch };
  for (const k of Object.keys(next) as (keyof StoredConfig)[]) if (next[k] === undefined) delete next[k];
  cache = next;
  await fs.mkdir(path.dirname(configPath()), { recursive: true });
  await fs.writeFile(configPath(), JSON.stringify(next, null, 2), 'utf8');
}

export async function getApiKey(): Promise<string | undefined> {
  const config = await readConfig();
  if (!config.apiKey) return undefined;
  if (!config.encrypted) return config.apiKey;
  try {
    return safeStorage.decryptString(Buffer.from(config.apiKey, 'base64'));
  } catch {
    return undefined;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  const canEncrypt = safeStorage.isEncryptionAvailable();
  await updateConfig({
    apiKey: canEncrypt ? safeStorage.encryptString(key).toString('base64') : key,
    encrypted: canEncrypt,
  });
}

export async function clearApiKey(): Promise<void> {
  await updateConfig({ apiKey: undefined, encrypted: undefined });
}

const maskKey = (key: string) => (key.length <= 8 ? '••••' : `${key.slice(0, 4)}••••${key.slice(-4)}`);

export async function getSettings(): Promise<Settings> {
  const key = await getApiKey();
  const config = await readConfig();
  return {
    hasKey: Boolean(key),
    maskedKey: key ? maskKey(key) : '',
    model: config.model ?? '',
    categories: config.categories?.length ? config.categories : DEFAULT_CATEGORIES,
    theme: config.theme,
    language: config.language,
  };
}

/** Idioma guardado (español si aún no se ha elegido). */
export async function getLanguage(): Promise<Lang> {
  return (await readConfig()).language ?? 'es';
}
