/**
 * Paleta y estilos globales de "Guardián de la Vid".
 * Colores orientados a viticultura: verdes institucionales, blanco y grises suaves.
 */
export const colors = {
  /** Verde oscuro: encabezados, botones primarios, acentos */
  primaryDark: '#1B4332',
  /** Verde intermedio para variaciones de superficie */
  primary: '#2D6A4F',
  /** Verde claro: highlights y elementos secundarios */
  primaryLight: '#52B788',
  /** Verde muy claro para fondos de tarjetas o badges */
  primaryMuted: '#D8F3DC',
  white: '#FFFFFF',
  /** Gris de fondo general */
  background: '#F4F6F5',
  /** Texto secundario y bordes suaves */
  textMuted: '#6B7280',
  text: '#1F2937',
  border: '#E5E7EB',
  danger: '#B91C1C',
  warning: '#D97706',
  success: '#047857',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
} as const;

export const typography = {
  title: { fontSize: 26, fontWeight: '700' as const },
  subtitle: { fontSize: 16, fontWeight: '500' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  button: { fontSize: 17, fontWeight: '600' as const },
};
