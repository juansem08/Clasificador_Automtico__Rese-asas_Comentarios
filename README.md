# Clasificador Automático de Reseñas y Comentarios

Aplicación de escritorio (Electron + React) que carga opiniones de clientes desde **CSV, Excel o una lista** y, con IA (**Google Gemini**), rellena automáticamente:

| Columna           | Valores                                                     |
| ----------------- | ----------------------------------------------------------- |
| **Sentimiento**   | Positivo · Negativo · Neutro                                |
| **Categoría**     | Atención · Precio · Calidad · Otro (personalizables)        |
| **Tema**          | Asunto concreto en pocas palabras (p. ej. "cobro duplicado") |
| **Prioridad**     | Alta · Media · Baja (urgencia para el negocio)              |
| **Confianza**     | 0–100 % (qué tan segura está la IA)                         |
| **Motivo**        | Frase que explica por qué se clasificó así                  |
| **Respuesta**     | Respuesta sugerida al cliente (opcional, generada con IA)   |

## Descargar e instalar

**[⬇️ Descargar la última versión](https://github.com/juansem08/Clasificador_Automtico__Rese-asas_Comentarios/releases/latest)**: no hace falta instalar Node.js ni nada más.

### Windows

| Archivo | Para qué sirve |
| ------- | -------------- |
| [**Clasificador-Resenas-IA-Setup-1.0.0.exe**](https://github.com/juansem08/Clasificador_Automtico__Rese-asas_Comentarios/releases/latest/download/Clasificador-Resenas-IA-Setup-1.0.0.exe) | **Instalador** (recomendado): crea accesos directos en el escritorio y el menú Inicio |
| [Clasificador-Resenas-IA-1.0.0-portable.exe](https://github.com/juansem08/Clasificador_Automtico__Rese-asas_Comentarios/releases/latest/download/Clasificador-Resenas-IA-1.0.0-portable.exe) | **Portable**: se abre directamente, sin instalar (útil en un USB o sin permisos de administrador) |

Pasos:

1. Descarga `Clasificador-Resenas-IA-Setup-1.0.0.exe`.
2. Ábrelo. Si aparece **"Windows protegió su PC"** (la app no tiene firma digital), pulsa **Más información → Ejecutar de todas formas**.
3. Elige la carpeta de instalación y pulsa **Instalar**.
4. Abre **Clasificador de Reseñas IA** desde el escritorio o el menú Inicio.
5. La primera vez, pega tu **API key de Gemini** (gratis en [Google AI Studio](https://aistudio.google.com/apikey)). Se guarda cifrada en el equipo.

Para desinstalarla: **Configuración de Windows → Aplicaciones → Clasificador de Reseñas IA → Desinstalar**.

### macOS y Linux

En la [página de la versión](https://github.com/juansem08/Clasificador_Automtico__Rese-asas_Comentarios/releases/latest) también están el `.dmg` (Mac con Apple Silicon o Intel) y el `.AppImage` / `.deb` (Linux). Las instrucciones de la primera apertura están en [Instaladores para Windows, macOS y Linux](#instaladores-para-windows-macos-y-linux).

## Funciones

- **Cargar datos**: CSV, `.xlsx`, `.txt` o lista pegada; detecta la columna de texto y la de fecha. **Limpieza previa**: las opiniones vacías se omiten y las duplicadas heredan la clasificación de la original (ahorra consultas a la API).
- **Resultados**: tabla con búsqueda y filtros (sentimiento, categoría, prioridad, "por revisar" = baja confianza). Al hacer clic se abre un **panel de detalle** para corregir la clasificación, ver el motivo y generar/copiar la respuesta sugerida (navegación con ↑ ↓).
- **Panel**: indicadores clave, distribución del sentimiento, categorías por sentimiento (gráfico o tabla), opiniones de prioridad alta y **tendencia en el tiempo** por semana o mes. Cada gráfico es clicable y lleva a los resultados filtrados.
- **Informe IA**: resumen ejecutivo, principales quejas, lo que más gusta y recomendaciones con su impacto. Exportable a **PDF** con los gráficos.
- **Exportar**: Excel `.xlsx` (hojas Clasificación, Resumen, Tendencia, Prioridad alta e Informe IA), CSV para Excel (`;`), CSV estándar (`,`) o PDF.
- **Historial**: cada análisis se guarda automáticamente en el equipo y se puede volver a abrir sin gastar API.
- **Configuración**: API key (cifrada), modelo de Gemini, tema claro/oscuro/sistema y **categorías personalizables** con su descripción.
- **Idiomas: español, inglés y ruso** (selector en la barra lateral y en Configuración). Cambia la interfaz, las exportaciones (Excel, CSV, PDF), los diálogos y el idioma en que la IA escribe motivos, temas e informe. Los diccionarios están en `src/i18n/` (`es.ts`, `en.ts`, `ru.ts`).

## Requisitos

- [Node.js](https://nodejs.org) 22.12 o superior
- Una API key de Gemini (gratis en [Google AI Studio](https://aistudio.google.com/apikey))

## Uso rápido

```bash
npm install
npm run dev
```

Atajos: en Windows, doble clic en `iniciar-app.bat`; en macOS/Linux, `./iniciar-app.sh`. Para probar sin un archivo propio usa **"Probar con datos de ejemplo"** en *Cargar datos*.

## Scripts

| Comando              | Descripción                                          |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Modo desarrollo (Vite + Electron con recarga)        |
| `npm start`          | Compila y abre la app sin servidor de desarrollo     |
| `npm run typecheck`  | Verificación de tipos TypeScript                     |
| `npm run dist`       | Genera los instaladores del sistema actual en `release/` |
| `npm run dist:win`   | Instalador y versión portable de Windows             |
| `npm run dist:mac`   | `.dmg` para Mac Intel y Apple Silicon (solo desde un Mac) |
| `npm run dist:linux` | `.AppImage` y `.deb` (solo desde Linux)              |
| `npm run icon`       | Regenera los PNG del ícono desde `build/icon.svg`    |

## Instaladores para Windows, macOS y Linux

Cada sistema solo puede empaquetar sus propios instaladores, así que la forma más cómoda de obtener **los tres a la vez** es GitHub Actions (gratis), ya configurado en `.github/workflows/build.yml`:

- **Manual:** en GitHub, pestaña **Actions → Instaladores → Run workflow**. Al terminar (~10 min), descarga los archivos desde *Artifacts*.
- **Como versión publicada:** `git tag v1.0.0 && git push --tags` crea una **Release** con todos los instaladores adjuntos.

| Sistema | Archivos | Primera apertura (app sin firma digital) |
| ------- | -------- | ---------------------------------------- |
| **Windows** | `…-Setup-1.0.0.exe` (instalador) y `…-portable.exe` | Si aparece "Windows protegió su PC": **Más información → Ejecutar de todas formas** |
| **macOS** | `…-mac-arm64.dmg` (M1/M2/M3/M4) y `…-mac-x64.dmg` (Intel) | Arrastra la app a *Aplicaciones*; la primera vez, **clic derecho → Abrir**. Si dice que "está dañada": `xattr -cr "/Applications/Clasificador de Reseñas IA.app"` |
| **Linux** | `…-linux-x86_64.AppImage` y `…-linux-amd64.deb` | AppImage: `chmod +x` y doble clic. Debian/Ubuntu: `sudo apt install ./archivo.deb` |

### Instalador con la API key incluida (opcional)

Para entregar la app lista para usar, sin que haya que pegar la clave, crea en la raíz del proyecto un archivo `.env.local` con:

```
GEMINI_API_KEY=tu_clave
```

y genera el instalador en tu equipo (`npm run dist:win`). La clave queda dentro de ese instalador y se usa siempre que el usuario no haya guardado una propia (la que pegue en la app tiene prioridad). `.env.local` está en `.gitignore`, así que nunca se sube a GitHub, y los instaladores de GitHub Actions salen sin clave. **Comparte ese instalador solo de forma privada**: la clave puede extraerse del archivo, así que conviene revocarla en Google AI Studio cuando ya no se necesite.

La configuración (API key cifrada, idioma, tema) y el historial se guardan en la carpeta de datos de usuario de cada sistema (`%APPDATA%`, `~/Library/Application Support` o `~/.config`).

## Estructura

```
electron/            Proceso principal (Node)
  main.ts            Ventana y canales IPC
  gemini.ts          Clasificación, respuestas e informe con Gemini (JSON con esquema + reintentos)
  config.ts          API key cifrada, modelo y categorías
  files.ts, xlsx.ts  Abrir CSV/Excel, guardar CSV, Excel y PDF
  history.ts         Historial de análisis
shared/types.ts      Tipos compartidos entre Electron y la interfaz
src/                 Interfaz React
  state/store.tsx    Estado y lógica de la app
  views/             Cargar, Resultados, Panel, Informe, Historial, Configuración
  components/        Barra lateral, pasos, panel de detalle, gráficos…
  lib/               Datos, fechas, estadísticas, exportaciones, informe PDF, tema
```

La API key nunca llega a la interfaz: todas las llamadas a Gemini se hacen desde el proceso principal de Electron.
