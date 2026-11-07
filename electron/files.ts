import { app, BrowserWindow, dialog } from 'electron';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AppError } from '../shared/errors';
import type { OpenedFile, SheetSpec } from '../shared/types';
import { translate } from '../src/i18n/core';
import { getLanguage } from './config';
import { readExcel, writeXlsx } from './xlsx';

const parentOf = (sender: Electron.WebContents) => BrowserWindow.fromWebContents(sender) ?? undefined;

async function askSavePath(
  sender: Electron.WebContents,
  defaultName: string,
  filter: Electron.FileFilter,
): Promise<string | null> {
  const lang = await getLanguage();
  const options: Electron.SaveDialogOptions = {
    title: translate(lang, 'dialogs.save'),
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [filter],
  };
  const win = parentOf(sender);
  const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
  return result.canceled || !result.filePath ? null : result.filePath;
}

export async function openFile(sender: Electron.WebContents): Promise<OpenedFile | null> {
  const lang = await getLanguage();
  const options: Electron.OpenDialogOptions = {
    title: translate(lang, 'dialogs.open'),
    filters: [
      { name: translate(lang, 'dialogs.reviewsFilter'), extensions: ['csv', 'tsv', 'txt', 'xlsx'] },
      { name: translate(lang, 'dialogs.allFiles'), extensions: ['*'] },
    ],
    properties: ['openFile'],
  };
  const win = parentOf(sender);
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
  const filePath = result.filePaths[0];
  if (result.canceled || !filePath) return null;
  return openPath(filePath);
}

/** Abre un archivo por su ruta (diálogo o arrastrar y soltar). */
export async function openPath(filePath: string): Promise<OpenedFile> {
  const name = path.basename(filePath);
  if (!/\.(csv|tsv|txt|xlsx|xls)$/i.test(name)) throw new AppError('format_unsupported');
  if (/\.xlsx$/i.test(name)) return { name, kind: 'excel', sheets: await readExcel(filePath) };
  if (/\.xls$/i.test(name)) throw new AppError('xls_unsupported');
  return { name, kind: 'text', data: new Uint8Array(await fs.readFile(filePath)) };
}

export async function saveCsv(sender: Electron.WebContents, defaultName: string, content: string) {
  const filePath = await askSavePath(sender, defaultName, { name: 'CSV', extensions: ['csv'] });
  if (!filePath) return null;
  // BOM para que Excel reconozca UTF-8 (tildes y ñ)
  await fs.writeFile(filePath, '﻿' + content, 'utf8');
  return filePath;
}

export async function saveXlsx(sender: Electron.WebContents, defaultName: string, sheets: SheetSpec[]) {
  const filePath = await askSavePath(sender, defaultName, { name: 'Excel', extensions: ['xlsx'] });
  if (!filePath) return null;
  await writeXlsx(filePath, sheets);
  return filePath;
}

/** Renderiza el HTML del informe en una ventana oculta y lo imprime a PDF. */
export async function savePdf(sender: Electron.WebContents, defaultName: string, html: string) {
  const filePath = await askSavePath(sender, defaultName, { name: 'PDF', extensions: ['pdf'] });
  if (!filePath) return null;

  const tmp = path.join(os.tmpdir(), `informe-${Date.now()}.html`);
  await fs.writeFile(tmp, html, 'utf8');
  const win = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true } });
  try {
    await win.loadFile(tmp);
    const pdf = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true });
    await fs.writeFile(filePath, pdf);
  } finally {
    win.destroy();
    await fs.rm(tmp, { force: true });
  }
  return filePath;
}
