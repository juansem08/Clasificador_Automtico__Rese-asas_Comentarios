import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { DesktopApi } from '../shared/types';

const api: DesktopApi = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setApiKey: (key) => ipcRenderer.invoke('key:set', key),
  clearApiKey: () => ipcRenderer.invoke('key:clear'),
  listModels: () => ipcRenderer.invoke('models:list'),
  setModel: (model) => ipcRenderer.invoke('model:set', model),
  setCategories: (categories) => ipcRenderer.invoke('categories:set', categories),
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
  setLanguage: (lang) => ipcRenderer.invoke('language:set', lang),

  classify: (items, model, categories) => ipcRenderer.invoke('ai:classify', items, model, categories),
  suggestReplies: (items, model) => ipcRenderer.invoke('ai:replies', items, model),
  generateReport: (input, model) => ipcRenderer.invoke('ai:report', input, model),

  openFile: () => ipcRenderer.invoke('file:open'),
  openDropped: (file) => ipcRenderer.invoke('file:openPath', webUtils.getPathForFile(file)),
  saveCsv: (name, content) => ipcRenderer.invoke('file:csv', name, content),
  saveXlsx: (name, sheets) => ipcRenderer.invoke('file:xlsx', name, sheets),
  savePdf: (name, html) => ipcRenderer.invoke('file:pdf', name, html),

  listHistory: () => ipcRenderer.invoke('history:list'),
  getHistory: (id) => ipcRenderer.invoke('history:get', id),
  saveHistory: (analysis) => ipcRenderer.invoke('history:save', analysis),
  deleteHistory: (id) => ipcRenderer.invoke('history:delete', id),
};

contextBridge.exposeInMainWorld('api', api);
