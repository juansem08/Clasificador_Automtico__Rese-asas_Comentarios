/*
 * Sistema de diseño por tokens: cada color es una variable CSS (definida en src/index.css)
 * con un valor para tema claro y otro para oscuro. Los componentes usan solo estos tokens.
 */
const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: c('canvas'),
        surface: c('surface'),
        sunken: c('sunken'),
        muted: c('muted'),
        line: { DEFAULT: c('line'), strong: c('line-strong') },
        ink: { DEFAULT: c('ink'), 2: c('ink-2'), 3: c('ink-3') },
        accent: { DEFAULT: c('accent'), hover: c('accent-hover'), soft: c('accent-soft'), ink: c('accent-ink') },
        'on-accent': c('on-accent'),
        inverse: { DEFAULT: c('inverse'), line: c('inverse-line') },
        'on-inverse': c('on-inverse'),
        night: c('night'),
        'on-night': c('on-night'),
        tape: c('tape'),
        'on-tape': c('on-tape'),
        pos: { DEFAULT: c('pos'), soft: c('pos-soft'), ink: c('pos-ink') },
        neu: { DEFAULT: c('neu'), soft: c('neu-soft'), ink: c('neu-ink') },
        neg: { DEFAULT: c('neg'), soft: c('neg-soft'), ink: c('neg-ink') },
        warn: { soft: c('warn-soft'), ink: c('warn-ink'), line: c('warn-line') },
        alta: { DEFAULT: c('alta'), ink: c('alta-ink') },
        danger: c('danger'),
        success: c('success'),
      },
      fontFamily: {
        // El navegador usa la segunda fuente para los caracteres que la primera no tiene (cirílico)
        sans: ['"Figtree Variable"', '"Onest Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['"Newsreader Variable"', '"Literata Variable"', 'Georgia', '"Times New Roman"', 'serif'],
      },
      borderRadius: {
        '4xl': '28px',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(31 26 23 / 0.04), 0 8px 24px -12px rgb(31 26 23 / 0.10)',
      },
    },
  },
  plugins: [],
};
