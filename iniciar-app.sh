#!/usr/bin/env bash
# Inicia la app en modo desarrollo en macOS o Linux (equivalente a iniciar-app.bat en Windows).
# Uso: chmod +x iniciar-app.sh && ./iniciar-app.sh
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Instalando dependencias por primera vez..."
  npm install
fi
echo "Iniciando Clasificador de Reseñas IA..."
npm run dev
