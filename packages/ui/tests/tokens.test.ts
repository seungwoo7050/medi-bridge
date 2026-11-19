import { describe, expect, it } from 'vitest';
import {
  CATEGORY_PIN_ACCENTS,
  MEDICAL_BENTO_COLORS,
  MEDICAL_BENTO_RADII,
  MEDICAL_BENTO_SHADOWS,
} from '../src/tokens';

describe('Medical Bento design tokens', () => {
  it('defines Deep Indigo and Soft Sage Green brand tokens without missing keys', () => {
    expect(MEDICAL_BENTO_COLORS.deepIndigo).toBe('#1E2456');
    expect(MEDICAL_BENTO_COLORS.softSage).toBe('#86B898');
    expect(MEDICAL_BENTO_RADII.card).toBe('14px');
    expect(MEDICAL_BENTO_SHADOWS.liquidGlass).toContain('rgba(30, 36, 86');
    expect(Object.keys(CATEGORY_PIN_ACCENTS)).toContain('치과');
    expect(Object.keys(CATEGORY_PIN_ACCENTS)).toContain('피부과');
  });
});
