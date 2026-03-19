import { CSSProperties } from 'react';

export const colors = {
  bgPrimary: '#0D1B2A',
  bgSurface: '#152537',
  bgHover: '#1A2F45',
  gold: '#C9A84C',
  goldDim: '#4A3820',
  textPrimary: '#F0E6D3',
  textMuted: '#8B9EB5',
  textDim: '#4A6278',
  border: '#1E3A52',
  error: '#E24B4A',
  success: '#4CAF82',
} as const;

export const fonts = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Inter', -apple-system, sans-serif",
} as const;

export const appContainer: CSSProperties = {
  maxWidth: 440,
  margin: '0 auto',
  minHeight: '100vh',
  position: 'relative',
  background: colors.bgPrimary,
};

export const globalScrollbarCSS = `
  * { transition: all 0.15s ease; }
  *::-webkit-scrollbar { width: 3px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 3px; }
  body { background: ${colors.bgPrimary}; margin: 0; padding: 0; }
`;
