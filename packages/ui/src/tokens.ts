export const MEDICAL_BENTO_COLORS = {
  deepIndigo: '#1E2456',
  indigoSurface: '#252D6B',
  indigoMuted: '#EEF0FA',
  indigoBorder: '#C7CEEB',
  softSage: '#86B898',
  sageAccent: '#2F6F55',
  sageSurface: '#EFF7F2',
  sageBorder: '#C5E1CF',
  surfaceLight: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.9)',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  amberScore: '#D97706',
  warningSurface: '#FFFBEB',
} as const;

export const MEDICAL_BENTO_SHADOWS = {
  liquidGlass: '0 8px 28px rgba(30, 36, 86, 0.14), 0 1px 3px rgba(30, 36, 86, 0.08)',
  cardRest: '0 2px 10px rgba(30, 36, 86, 0.07)',
  floatingPill: '0 6px 20px rgba(30, 36, 86, 0.22)',
} as const;

export const MEDICAL_BENTO_RADII = {
  card: '14px',
  subCard: '10px',
  pill: '9999px',
} as const;

export type ClinicCategoryPinKind = '치과' | '안과' | '피부과' | '정형외과' | '성형외과' | '기타';

export const CATEGORY_PIN_ACCENTS: Readonly<Record<ClinicCategoryPinKind, string>> = {
  치과: '#2F6F55',
  안과: '#1E2456',
  피부과: '#4338CA',
  정형외과: '#0F766E',
  성형외과: '#6D28D9',
  기타: '#374151',
};
