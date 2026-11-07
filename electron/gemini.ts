import { GoogleGenAI, Type } from '@google/genai';
import {
  FALLBACK_CATEGORY,
  IMPACTS,
  PRIORITIES,
  SENTIMENTS,
  type CategoryDef,
  type Classification,
  type Impact,
  type ReplyInput,
  type ReplyResult,
  type Report,
  type ReportInput,
  type Lang,
  type ReviewInput,
} from '../shared/types';
import { AppError } from '../shared/errors';

/** Error de Gemini con código traducible (`errors.<code>`). `fatal` = no tiene sentido seguir con más lotes. */
export class GeminiError extends AppError {}

/** Nombre del idioma para las instrucciones a la IA. */
const LANGUAGE_NAMES: Record<Lang, string> = { es: 'español', en: 'inglés (English)', ru: 'ruso (русский)' };

const MAX_CHARS_PER_REVIEW = 2000;
const MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

function matchEnum<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  if (typeof value !== 'string') return undefined;
  const v = normalize(value);
  return options.find((o) => normalize(o) === v);
}

function statusOf(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status: unknown }).status;
    if (typeof s === 'number') return s;
  }
  const m = String(err instanceof Error ? err.message : err).match(/\b(400|401|403|404|429|500|502|503|504)\b/);
  return m ? Number(m[1]) : undefined;
}

function toFriendlyError(err: unknown, model?: string): GeminiError {
  if (err instanceof GeminiError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const status = statusOf(err);

  if (err instanceof SyntaxError) return new GeminiError('bad_format');
  if (status === 400 && /api[ _-]?key/i.test(msg)) return new GeminiError('invalid_key', true);
  if (status === 401 || status === 403) return new GeminiError('forbidden', true);
  if (status === 404) return new GeminiError('model_not_found', true, { model: model ?? '' });
  if (status === 429) return new GeminiError('quota', true);
  if (isOverloaded(status) || /UNAVAILABLE|overloaded|high demand/i.test(msg)) return new GeminiError('overloaded', true);
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|network/i.test(msg)) return new GeminiError('network', true);
  return new GeminiError('gemini', false, { detail: extractApiMessage(msg) });
}

const isOverloaded = (status?: number) => status === 500 || status === 502 || status === 503 || status === 504;

/** Si el error trae el JSON de Google, devuelve solo su "message". */
function extractApiMessage(msg: string): string {
  const start = msg.indexOf('{');
  if (start >= 0) {
    try {
      const parsed = JSON.parse(msg.slice(start)) as { error?: { message?: string } };
      if (parsed.error?.message) return parsed.error.message;
    } catch {
      // no era JSON
    }
  }
  return msg;
}

export interface Generated<T> {
  result: T;
  /** Modelo que respondió (puede ser uno de respaldo). */
  model: string;
}

/**
 * Llama a Gemini pidiendo JSON con esquema. Recorre la cadena de modelos: si uno está saturado (5xx),
 * sin cuota (429) o no existe (404), pasa al siguiente. Reintenta respuestas mal formadas.
 */
async function generateJson(
  apiKey: string,
  models: string[],
  opts: { system: string; prompt: string; schema: object; temperature?: number },
): Promise<Generated<unknown>> {
  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;
  let lastModel = models[0] ?? '';
  for (const model of models) {
    lastModel = model;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: opts.prompt,
          config: {
            systemInstruction: opts.system,
            responseMimeType: 'application/json',
            responseSchema: opts.schema,
            temperature: opts.temperature ?? 0,
          },
        });
        return { result: JSON.parse(response.text ?? ''), model };
      } catch (err) {
        lastError = err;
        const status = statusOf(err);
        if (err instanceof SyntaxError) continue; // reintenta el mismo modelo
        if (status === 404 || status === 429) break; // siguiente modelo
        if (isOverloaded(status) || /UNAVAILABLE|high demand/i.test(String(err))) {
          // un reintento corto y luego al siguiente modelo
          if (attempt === 0) {
            await sleep(1500);
            continue;
          }
          break;
        }
        throw toFriendlyError(err, model); // clave inválida, petición mal formada…: no tiene sentido seguir
      }
    }
  }
  throw toFriendlyError(lastError, lastModel);
}

// ---------- Modelos ----------

const modelVersion = (name: string) => parseFloat(name.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0');
const isStable = (name: string) => !/(preview|exp|latest)/i.test(name);

/** Lista los modelos Gemini de texto disponibles para la API key, del más nuevo al más antiguo. */
export async function listModels(apiKey: string): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey });
  const names = new Set<string>();
  try {
    const pager = await ai.models.list({ config: { pageSize: 100 } });
    for await (const m of pager) {
      const name = (m.name ?? '').replace(/^models\//, '');
      const actions = m.supportedActions ?? [];
      if (
        name.startsWith('gemini') &&
        actions.includes('generateContent') &&
        !/(embedding|tts|image|live|audio|robotics|computer-use|native)/i.test(name)
      ) {
        names.add(name);
      }
    }
  } catch (err) {
    throw toFriendlyError(err);
  }
  return [...names].sort(
    (a, b) => modelVersion(b) - modelVersion(a) || Number(isStable(b)) - Number(isStable(a)) || a.localeCompare(b),
  );
}

/**
 * Cadena de modelos a probar: el elegido primero y, como respaldo, hasta dos Flash estables
 * distintos (los modelos de respaldo tienen su propia cuota y suelen estar menos saturados).
 */
export function modelChain(selected: string, available: string[]): string[] {
  const backups = available.filter((n) => n !== selected && /flash/i.test(n) && isStable(n));
  const full = backups.filter((n) => !/lite/i.test(n));
  const lite = backups.filter((n) => /lite/i.test(n));
  return [selected, ...[full[0], lite[0], full[1]].filter(Boolean).slice(0, 2)] as string[];
}

/** El Flash estable más reciente. */
export function pickDefaultModel(models: string[]): string {
  return (
    models.find((n) => /flash/i.test(n) && !/lite/i.test(n) && isStable(n)) ??
    models.find((n) => /flash/i.test(n)) ??
    models[0] ??
    ''
  );
}

// ---------- Clasificación ----------

function classifySystem(categories: CategoryDef[], lang: Lang): string {
  const catLines = categories.map((c) => `   - "${c.name}": ${c.description}`).join('\n');
  const idioma = LANGUAGE_NAMES[lang];
  return `Eres un analista experto en experiencia del cliente. Clasificas opiniones, reseñas y comentarios de clientes (pueden venir en cualquier idioma).

Para cada opinión devuelve:

- "motivo": una frase breve en ${idioma} (máximo 20 palabras) que explique la clasificación, citando lo que dice el cliente.
- "tema": el asunto concreto en 2 a 4 palabras en ${idioma} y en minúsculas (p. ej. "cobro duplicado", "tabla de tallas", "atención rápida", traducidos a ${idioma}).
  Los valores de "sentimiento", "categoria" y "prioridad" se escriben SIEMPRE exactamente como en las listas de abajo, sin traducir.
- "sentimiento":
   - "Positivo": el cliente está satisfecho, elogia o recomienda.
   - "Negativo": expresa una queja, insatisfacción, problema o mala experiencia.
   - "Neutro": es informativa, una pregunta, ambigua o mixta sin un tono predominante.
- "categoria": el tema principal de la opinión:
${catLines}
   - "${FALLBACK_CATEGORY}": solo si claramente no encaja en ninguna de las anteriores.
  Si menciona varios temas, elige el más destacado (en las negativas, el problema principal).
- "prioridad": urgencia con la que el negocio debería atenderla:
   - "Alta": problema grave que requiere acción inmediata: cobros indebidos, producto dañado o peligroso, riesgo para la salud, maltrato, amenaza de abandonar, reclamar o denunciar.
   - "Media": queja o inconveniente real pero no grave.
   - "Baja": opiniones positivas, neutras o quejas muy leves.
- "confianza": número entero de 0 a 100 que indica qué tan seguro estás de la clasificación (baja si la opinión es ambigua, irónica o muy corta).

Devuelve exactamente un objeto por cada "id" recibido, usando el mismo "id".`;
}

export async function classifyBatch(
  apiKey: string,
  models: string[],
  items: ReviewInput[],
  categories: CategoryDef[],
  lang: Lang,
): Promise<Generated<Classification[]>> {
  if (items.length === 0) return { result: [], model: models[0] ?? '' };
  const categoryNames = [...categories.map((c) => c.name), FALLBACK_CATEGORY];

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER },
        motivo: { type: Type.STRING },
        tema: { type: Type.STRING },
        sentimiento: { type: Type.STRING, enum: [...SENTIMENTS] },
        categoria: { type: Type.STRING, enum: categoryNames },
        prioridad: { type: Type.STRING, enum: [...PRIORITIES] },
        confianza: { type: Type.INTEGER },
      },
      required: ['id', 'motivo', 'tema', 'sentimiento', 'categoria', 'prioridad', 'confianza'],
      propertyOrdering: ['id', 'motivo', 'tema', 'sentimiento', 'categoria', 'prioridad', 'confianza'],
    },
  };

  const payload = JSON.stringify(items.map((i) => ({ id: i.id, opinion: i.text.trim().slice(0, MAX_CHARS_PER_REVIEW) })));
  const { result: parsed, model } = await generateJson(apiKey, models, {
    system: classifySystem(categories, lang),
    prompt: `Clasifica estas ${items.length} opiniones de clientes:\n${payload}`,
    schema,
  });
  if (!Array.isArray(parsed)) throw toFriendlyError(new SyntaxError('no es lista'));

  const validIds = new Set(items.map((i) => i.id));
  const results: Classification[] = [];
  for (const raw of parsed as Record<string, unknown>[]) {
    const id = Number(raw.id);
    const sentimiento = matchEnum(raw.sentimiento, SENTIMENTS);
    const categoria = matchEnum(raw.categoria, categoryNames);
    const prioridad = matchEnum(raw.prioridad, PRIORITIES) ?? 'Baja';
    const confianza = Math.max(0, Math.min(100, Math.round(Number(raw.confianza) || 0)));
    if (validIds.has(id) && sentimiento && categoria) {
      results.push({
        id,
        sentimiento,
        categoria,
        prioridad,
        confianza,
        motivo: String(raw.motivo ?? '').trim(),
        tema: String(raw.tema ?? '').trim().toLowerCase(),
      });
    }
  }
  return { result: results, model };
}

// ---------- Respuestas sugeridas ----------

const REPLY_SYSTEM = `Eres el responsable de atención al cliente de la empresa. Redactas respuestas públicas a opiniones de clientes.
Reglas:
- 2 a 4 frases, tono cercano, empático y profesional, en el mismo idioma de la opinión.
- Reconoce el problema concreto que menciona el cliente y discúlpate cuando corresponda.
- Ofrece una solución o invita a continuar por un canal privado de forma genérica.
- No inventes datos: nada de nombres, teléfonos, correos, porcentajes de descuento ni promesas específicas.
- Si la opinión es positiva, agradece de forma específica.`;

export async function suggestReplies(apiKey: string, models: string[], items: ReplyInput[]): Promise<Generated<ReplyResult[]>> {
  if (items.length === 0) return { result: [], model: models[0] ?? '' };
  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: { id: { type: Type.INTEGER }, respuesta: { type: Type.STRING } },
      required: ['id', 'respuesta'],
    },
  };
  const payload = JSON.stringify(
    items.map((i) => ({
      id: i.id,
      opinion: i.text.slice(0, MAX_CHARS_PER_REVIEW),
      sentimiento: i.sentimiento,
      categoria: i.categoria,
    })),
  );
  const { result: parsed, model } = await generateJson(apiKey, models, {
    system: REPLY_SYSTEM,
    prompt: `Redacta una respuesta para cada una de estas opiniones:\n${payload}`,
    schema,
    temperature: 0.6,
  });
  if (!Array.isArray(parsed)) throw toFriendlyError(new SyntaxError('no es lista'));
  const valid = new Set(items.map((i) => i.id));
  const result = (parsed as Record<string, unknown>[])
    .map((r) => ({ id: Number(r.id), respuesta: String(r.respuesta ?? '').trim() }))
    .filter((r) => valid.has(r.id) && r.respuesta);
  return { result, model };
}

// ---------- Informe ejecutivo ----------

const reportSystem = (lang: Lang) => `Eres consultor senior de experiencia del cliente. A partir de estadísticas y una muestra de opiniones ya clasificadas, escribes un informe ejecutivo en ${LANGUAGE_NAMES[lang]}, claro y accionable, para la gerencia del negocio.
Reglas:
- Escribe TODOS los textos (titular, resumen, quejas, fortalezas y recomendaciones) en ${LANGUAGE_NAMES[lang]}, aunque los datos estén en otro idioma.
- "categoria" e "impacto" se escriben exactamente como en los datos o en la lista indicada, sin traducir.
- "titular": una frase corta y memorable (máximo 14 palabras) que capture lo más importante, al estilo de un titular de revista; usa punto y coma para contrastar lo bueno y lo urgente si aplica.
- "resumen": 3 a 4 frases con la situación general, citando los porcentajes más relevantes.
- "quejas": de 3 a 5 problemas principales, del más al menos importante; "detalle" explica qué dicen los clientes con ejemplos concretos; "categoria" es la categoría a la que pertenece.
- "fortalezas": hasta 3 aspectos que más valoran los clientes (lista vacía si no hay opiniones positivas).
- "recomendaciones": de 3 a 5 acciones concretas y realistas, cada una con su impacto esperado ("Alto", "Medio" o "Bajo").
- Básate solo en los datos recibidos; no inventes cifras.`;

export async function generateReport(
  apiKey: string,
  models: string[],
  input: ReportInput,
  lang: Lang,
): Promise<Generated<Omit<Report, 'generadoEn' | 'modelo'>>> {
  const schema = {
    type: Type.OBJECT,
    properties: {
      titular: { type: Type.STRING },
      resumen: { type: Type.STRING },
      quejas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            detalle: { type: Type.STRING },
            categoria: { type: Type.STRING },
          },
          required: ['titulo', 'detalle', 'categoria'],
        },
      },
      fortalezas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { titulo: { type: Type.STRING }, detalle: { type: Type.STRING } },
          required: ['titulo', 'detalle'],
        },
      },
      recomendaciones: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { accion: { type: Type.STRING }, impacto: { type: Type.STRING, enum: [...IMPACTS] } },
          required: ['accion', 'impacto'],
        },
      },
    },
    required: ['titular', 'resumen', 'quejas', 'fortalezas', 'recomendaciones'],
    propertyOrdering: ['titular', 'resumen', 'quejas', 'fortalezas', 'recomendaciones'],
  };

  const generated = await generateJson(apiKey, models, {
    system: reportSystem(lang),
    prompt: `Datos del análisis "${input.nombre}":\n${JSON.stringify(input)}`,
    schema,
    temperature: 0.3,
  });
  const parsed = (generated.result ?? {}) as Record<string, unknown>;

  const arr = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  const result = {
    titular: String(parsed.titular ?? '').trim(),
    resumen: String(parsed.resumen ?? ''),
    quejas: arr(parsed.quejas).map((q) => ({
      titulo: String(q.titulo ?? ''),
      detalle: String(q.detalle ?? ''),
      categoria: String(q.categoria ?? ''),
    })),
    fortalezas: arr(parsed.fortalezas).map((f) => ({ titulo: String(f.titulo ?? ''), detalle: String(f.detalle ?? '') })),
    recomendaciones: arr(parsed.recomendaciones).map((r) => ({
      accion: String(r.accion ?? ''),
      impacto: (matchEnum(r.impacto, IMPACTS) ?? 'Medio') as Impact,
    })),
  };
  return { result, model: generated.model };
}
