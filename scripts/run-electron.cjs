// Lanza Electron limpiando ELECTRON_RUN_AS_NODE: algunas terminales (p. ej. dentro de VS Code)
// la definen y harían que Electron arranque como Node sin abrir la ventana.
// Sin argumentos abre la app; con argumentos ejecuta ese script con Electron (p. ej. make-icon.cjs).
const { spawn } = require('node:child_process');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
const child = spawn(electronPath, args.length ? args : ['.'], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
