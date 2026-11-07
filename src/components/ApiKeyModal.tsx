import { ExternalLink, Eye, EyeOff, KeyRound, LoaderCircle, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Rich, useI18n } from '../i18n/I18n';
import { useStore } from '../state/store';

export default function ApiKeyModal() {
  const { settings, setShowKeyModal, refreshSettings, refreshModels, setNotice } = useStore();
  const { t, error: errText } = useI18n();
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canClose = settings.hasKey && !saving;
  const close = () => setShowKeyModal(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose) setShowKeyModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canClose, setShowKeyModal]);

  const save = async () => {
    if (!key.trim() || saving) return;
    setSaving(true);
    setError('');
    const res = await window.api.setApiKey(key);
    setSaving(false);
    if (!res.ok) return setError(errText(res));
    await refreshModels();
    close();
    setNotice({ kind: 'success', text: t('apiKey.saved') });
  };

  const clear = async () => {
    await window.api.clearApiKey();
    setKey('');
    await refreshSettings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-8 shadow-soft">
        <div className="mb-6 flex items-start justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
            <KeyRound size={22} />
          </span>
          {canClose && (
            <button className="btn-icon" onClick={close} aria-label={t('common.close')}>
              <X size={18} />
            </button>
          )}
        </div>
        <h2 className="display text-4xl">
          <Rich text={t('apiKey.title')} />
        </h2>
        <p className="mt-2 text-sm text-ink-2">{t('apiKey.subtitle')}</p>

        {settings.hasKey && (
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-sunken px-4 py-2.5 text-sm">
            <span>
              {t('apiKey.current')} <span className="font-mono">{settings.maskedKey}</span>
            </span>
            <button className="flex items-center gap-1 font-semibold text-danger hover:underline" onClick={clear}>
              <Trash2 size={14} /> {t('common.delete')}
            </button>
          </div>
        )}

        <label className="eyebrow mb-1.5 mt-5 block" htmlFor="api-key">
          {settings.hasKey ? t('apiKey.replace') : t('apiKey.paste')}
        </label>
        <div className="relative">
          <input
            id="api-key"
            className="input pr-12 font-mono"
            type={show ? 'text' : 'password'}
            placeholder="AIza..."
            value={key}
            autoFocus
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
          />
          <button
            className="btn-icon absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? t('apiKey.hide') : t('apiKey.show')}
            type="button"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && <p className="mt-3 rounded-2xl bg-neg-soft px-4 py-2.5 text-sm font-medium text-neg-ink">{error}</p>}

        <a
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink hover:underline"
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
        >
          {t('apiKey.getFree')} <ExternalLink size={13} />
        </a>

        <div className="mt-7 flex justify-end gap-2">
          {canClose && (
            <button className="btn-outline" onClick={close}>
              {t('common.cancel')}
            </button>
          )}
          <button className="btn-primary" onClick={save} disabled={!key.trim() || saving}>
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            {saving ? t('apiKey.verifying') : t('apiKey.saveVerify')}
          </button>
        </div>
      </div>
    </div>
  );
}
