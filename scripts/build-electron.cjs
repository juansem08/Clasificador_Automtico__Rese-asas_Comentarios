// Compila el proceso principal y el preload de Electron con esbuild.
//
// Clave incluida (opcional): si existe un archivo .env.local con GEMINI_API_KEY=..., esa clave se
// incrusta en el ejecutable para que la app funcione sin configurarla. .env.local está en .gitignore:
// nunca se sube a GitHub, y los instaladores de GitHub Actions salen sin clave.
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');

function readBundledKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const file = path.join(root, '.env.local');
  if (!fs.existsSync(file)) return '';
  const match = fs.readFileSync(file, 'utf8').match(/^\s*GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m);
  return match ? match[1].trim() : '';
}

const key = readBundledKey();
console.log(key ? '[build] Clave de Gemini incluida desde .env.local' : '[build] Sin clave incluida');

const common = { bundle: true, platform: 'node', format: 'cjs', absWorkingDir: root, logLevel: 'warning' };

Promise.all([
  esbuild.build({
    ...common,
    entryPoints: ['electron/main.ts'],
    packages: 'external',
    outfile: 'dist-electron/main.cjs',
    define: { __BUNDLED_API_KEY__: JSON.stringify(key) },
  }),
  esbuild.build({
    ...common,
    entryPoints: ['electron/preload.ts'],
    external: ['electron'],
    outfile: 'dist-electron/preload.cjs',
  }),
]).catch(() => process.exit(1));
