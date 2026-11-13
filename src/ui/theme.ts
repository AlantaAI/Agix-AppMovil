/**
 * Tokens visuales de Agix, los mismos de la web (`src/index.css`, variables
 * `--lg-*`): fondo azul con puntos, tarjetas blancas con borde azul y sombra
 * dura, magenta como acento.
 */
export const colors = {
  bgTop: '#1272bd',
  bgMid: '#1553cc',
  bgMid2: '#1b46d2',
  bgBottom: '#152da0',
  card: '#ffffff',
  cardSubtle: '#eaf2ff',
  border: '#1b3bd6',
  borderInner: 'rgba(27, 59, 214, 0.24)',
  navy: '#10205e',
  text: '#10205e',
  textSecondary: '#2f4bb0',
  textMuted: '#4d5fae',
  onBg: '#ffffff',
  onBgMuted: '#f0f7ff',
  accent: '#c9186a',
  accentBright: '#ff2e8b',
  accentSubtle: '#ffe2ef',
  blue: '#1b3bd6',
  blueDark: '#1230b8',
  iconBg: '#dbe7ff',
  teal: '#0f7f5e',
  tealSubtle: '#dcf5ec',
  gold: '#8f6100',
  goldSubtle: '#fff3c4',
  danger: '#c62a1e',
  dangerSubtle: '#fee4e2',
  backdrop: 'rgba(9, 24, 92, 0.62)',
} as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/** Nunito, como la web. Cada peso es una familia en React Native. */
export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

/** La firma de los paneles de la web: sombra dura azul + una suave. */
export const shadow = {
  card: '0px 4px 0px #1b3bd6, 0px 8px 14px rgba(10, 30, 110, 0.18)',
  raised: '0px 5px 0px #1b3bd6, 0px 12px 20px rgba(10, 30, 110, 0.24)',
  accent: '0px 4px 0px #8f0f4b, 0px 8px 14px rgba(120, 10, 60, 0.28)',
  soft: '0px 6px 16px rgba(10, 30, 110, 0.18)',
} as const;
