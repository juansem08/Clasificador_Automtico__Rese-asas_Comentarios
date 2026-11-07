import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import fs from 'node:fs/promises';
import { AppError } from '../shared/errors';
import type { SheetData, SheetSpec } from '../shared/types';

// Lectura y escritura de Excel (sin dependencias de Electron, para poder probarlo aparte).

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const v = value as unknown as Record<string, unknown>;
    if (Array.isArray(v.richText)) return (v.richText as { text: string }[]).map((t) => t.text).join('');
    if ('result' in v || 'formula' in v || 'sharedFormula' in v) return cellToString((v.result ?? null) as ExcelJS.CellValue);
    if ('text' in v) return String(v.text);
    if ('error' in v) return '';
  }
  return String(value);
}

/** Convierte las filas de una hoja (fila 1 = encabezados) en registros. */
function toSheet(name: string, rows: string[][]): SheetData | null {
  const headerRow = rows[0] ?? [];
  const width = Math.max(headerRow.length, ...rows.map((r) => r.length), 0);
  if (width === 0) return null;

  const headers: string[] = [];
  const used = new Set<string>();
  for (let c = 0; c < width; c++) {
    const base = (headerRow[c] ?? '').trim() || `Columna ${c + 1}`;
    let h = base;
    for (let n = 2; used.has(h); n++) h = `${base} (${n})`;
    used.add(h);
    headers.push(h);
  }

  const records: Record<string, string>[] = [];
  for (const row of rows.slice(1)) {
    if (!row.some((v) => v && v.trim())) continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => (rec[h] = (row[i] ?? '').trim()));
    records.push(rec);
  }
  return records.length > 0 ? { name, headers, records } : null;
}

/**
 * Lee todas las hojas con datos. Primero con el lector completo de exceljs (conoce los nombres de
 * las hojas); si falla —p. ej. con libros que tienen gráficos o dibujos— usa el lector por
 * streaming, que solo procesa las celdas.
 */
export async function readExcel(filePath: string): Promise<SheetData[]> {
  let sheets: SheetData[];
  try {
    sheets = await readFull(filePath);
  } catch {
    sheets = await readStreaming(filePath);
  }
  if (sheets.length === 0) throw new AppError('excel_empty');
  return sheets;
}

async function readFull(filePath: string): Promise<SheetData[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  return wb.worksheets
    .map((ws) => {
      const rows: string[][] = [];
      ws.eachRow({ includeEmpty: false }, (row, n) => {
        const values: string[] = [];
        row.eachCell({ includeEmpty: false }, (cell, col) => (values[col - 1] = cellToString(cell.value)));
        rows[n - 1] = Array.from(values, (v) => v ?? '');
      });
      return toSheet(ws.name, Array.from(rows, (r) => r ?? []));
    })
    .filter((s): s is SheetData => s !== null);
}

/** Nombres de las hojas según su archivo interno (sheet1.xml → "Datos_Resenas"). */
async function sheetNamesByFile(filePath: string): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  try {
    const zip = await JSZip.loadAsync(await fs.readFile(filePath));
    const workbook = (await zip.file('xl/workbook.xml')?.async('string')) ?? '';
    const rels = (await zip.file('xl/_rels/workbook.xml.rels')?.async('string')) ?? '';
    const targets = new Map<string, string>();
    for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
      const id = m[0].match(/\bId="([^"]+)"/)?.[1];
      const target = m[0].match(/\bTarget="([^"]+)"/)?.[1];
      if (id && target) targets.set(id, target.split('/').pop()!.toLowerCase());
    }
    for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
      const name = m[0].match(/\bname="([^"]+)"/)?.[1];
      const rid = m[0].match(/\br:id="([^"]+)"/)?.[1];
      const file = rid && targets.get(rid);
      if (name && file) names.set(file, decodeXml(name));
    }
  } catch {
    // sin nombres: se usan "Hoja 1", "Hoja 2"…
  }
  return names;
}

const decodeXml = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

async function readStreaming(filePath: string): Promise<SheetData[]> {
  const names = await sheetNamesByFile(filePath);
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'cache', // necesario para reconocer las fechas
    worksheets: 'emit',
    entries: 'emit',
  });

  const sheets: { name: string; order: number; rows: string[][] }[] = [];
  let order = 0;
  for await (const ws of reader) {
    const wsAny = ws as unknown as { name?: string; id?: number };
    const rows: string[][] = [];
    for await (const row of ws) {
      const values: string[] = [];
      (row as ExcelJS.Row).eachCell({ includeEmpty: false }, (cell, col) => {
        values[col - 1] = cellToString(cell.value);
      });
      rows[(row as ExcelJS.Row).number - 1] = Array.from(values, (v) => v ?? '');
    }
    const id = wsAny.id ?? order + 1;
    const name = names.get(`sheet${id}.xml`) ?? `Hoja ${id}`;
    sheets.push({ name, order: id, rows: Array.from(rows, (r) => r ?? []) });
    order++;
  }

  return sheets
    .sort((a, b) => a.order - b.order)
    .map((s) => toSheet(s.name, s.rows))
    .filter((s): s is SheetData => s !== null);
}

export async function writeXlsx(filePath: string, sheets: SheetSpec[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Clasificador de Reseñas IA';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31), {
      views: sheet.autoFilter ? [{ state: 'frozen', ySplit: 1 }] : [],
    });
    sheet.rows.forEach((r) => ws.addRow(r));
    sheet.widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    for (const c of sheet.wrapColumns ?? []) {
      ws.getColumn(c + 1).alignment = { wrapText: true, vertical: 'top' };
    }
    for (const r of sheet.headerRows) {
      ws.getRow(r + 1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    }
    if (sheet.autoFilter && sheet.rows[0]) {
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.rows[0].length } };
    }
  }

  await wb.xlsx.writeFile(filePath);
}
