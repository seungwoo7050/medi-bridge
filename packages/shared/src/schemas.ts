import { z } from 'zod';

export const TreatmentCategorySchema = z.enum([
  '안과',
  '치과',
  '피부과',
  '정형외과',
  '성형외과',
  '기타',
]);
export type TreatmentCategory = z.infer<typeof TreatmentCategorySchema>;

export const PlatformSourceSchema = z.enum([
  'hira',
  'modoodoc',
  'gangnamunni',
  'yeoshin',
  'babitalk',
  'goodoc',
]);
export type PlatformSource = z.infer<typeof PlatformSourceSchema>;

export const PLATFORM_LABELS: Readonly<Record<PlatformSource, string>> = {
  hira: '병원 신고 정가',
  modoodoc: '모두닥',
  gangnamunni: '강남언니',
  yeoshin: '여신티켓',
  babitalk: '바비톡',
  goodoc: '굿닥',
};

export const OfferBadgeSchema = z.enum(['정가기준', '특가', '이벤트', '첫방문']).nullable();
export type OfferBadge = z.infer<typeof OfferBadgeSchema>;

export const StandardTreatmentSchema = z.object({
  code: z.string().min(1),
  category: TreatmentCategorySchema,
  label: z.string().min(1),
  unitLabel: z.string().default('1회'),
  aliases: z.array(z.string().min(1)),
});
export type StandardTreatment = z.infer<typeof StandardTreatmentSchema>;

export const RawPlatformOfferSchema = z.object({
  id: z.string().min(1),
  platform: PlatformSourceSchema,
  treatmentCode: z.string().min(1),
  treatmentName: z.string().min(1),
  rawTitle: z.string().min(1),
  listedPrice: z.number().int().nonnegative(),
  vatIncluded: z.boolean(),
  badge: OfferBadgeSchema,
  bookingUrl: z.string().url(),
  updatedAt: z.string().min(1),
});
export type RawPlatformOffer = z.infer<typeof RawPlatformOfferSchema>;

export const NormalizedPriceOfferSchema = RawPlatformOfferSchema.extend({
  platformLabel: z.string().min(1),
  effectivePrice: z.number().int().nonnegative(),
  effectivePriceVatIncluded: z.number().int().nonnegative(),
  effectivePriceVatExcluded: z.number().int().nonnegative(),
  hiraBaselinePrice: z.number().int().nonnegative().nullable(),
  savingsAmount: z.number().int(),
  savingsPercent: z.number().int(),
  isLowest: z.boolean(),
});
export type NormalizedPriceOffer = z.infer<typeof NormalizedPriceOfferSchema>;
