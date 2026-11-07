import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Analysis, AnalysisMeta } from '../shared/types';

const dir = () => path.join(app.getPath('userData'), 'historial');
const fileFor = (id: string) => path.join(dir(), `${id.replace(/[^a-zA-Z0-9-]/g, '')}.json`);

function toMeta(a: Analysis): AnalysisMeta {
  const classified = a.rows.filter((r) => r.sentimiento);
  return {
    id: a.id,
    name: a.name,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    total: a.rows.length,
    classified: classified.length,
    pending: a.rows.filter((r) => r.status === 'pending' || r.status === 'error').length,
    positivos: classified.filter((r) => r.sentimiento === 'Positivo').length,
    negativos: classified.filter((r) => r.sentimiento === 'Negativo').length,
  };
}

export async function listHistory(): Promise<AnalysisMeta[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(dir())).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const metas: AnalysisMeta[] = [];
  for (const f of files) {
    try {
      metas.push(toMeta(JSON.parse(await fs.readFile(path.join(dir(), f), 'utf8')) as Analysis));
    } catch {
      // archivo dañado: se ignora
    }
  }
  return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getHistory(id: string): Promise<Analysis | null> {
  try {
    return JSON.parse(await fs.readFile(fileFor(id), 'utf8')) as Analysis;
  } catch {
    return null;
  }
}

export async function saveHistory(analysis: Analysis): Promise<void> {
  await fs.mkdir(dir(), { recursive: true });
  await fs.writeFile(fileFor(analysis.id), JSON.stringify(analysis), 'utf8');
}

export async function deleteHistory(id: string): Promise<void> {
  await fs.rm(fileFor(id), { force: true });
}
