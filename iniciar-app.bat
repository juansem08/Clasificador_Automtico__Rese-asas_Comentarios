@echo off
title Clasificador de Resenas IA
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias por primera vez...
  call npm install
)
echo Iniciando Clasificador de Resenas IA...
call npm run dev
pause
