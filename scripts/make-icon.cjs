// Genera los PNG del ícono a partir de build/icon.svg usando Electron (sin dependencias extra).
// Uso: npm run icon
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'build', 'icon.svg'), 'utf8');
const SIZE = 1024;

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    useContentSize: true,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true },
  });
  // El SVG ocupa toda la ventana; se captura la página completa y se escala (sea cual sea la escala de pantalla)
  const sized = svg.replace('<svg ', '<svg style="display:block;width:100vw;height:100vh" ');
  const html = `<html><body style="margin:0;background:transparent;overflow:hidden">${sized}</body></html>`;
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 500));

  const image = (await win.webContents.capturePage()).resize({ width: SIZE, height: SIZE, quality: 'best' });
  fs.writeFileSync(path.join(root, 'build', 'icon.png'), image.toPNG());
  fs.mkdirSync(path.join(root, 'public'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public', 'icon.png'), image.resize({ width: 256, height: 256, quality: 'best' }).toPNG());
  console.log('Ícono generado: build/icon.png (1024) y public/icon.png (256)');
  app.exit(0);
});
