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
  hira: '심평원 신고가',
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

export const HiraBaselineItemSchema = z.object({
  treatmentCode: z.string().min(1),
  treatmentName: z.string().min(1),
  minPrice: z.number().int().nonnegative(),
  maxPrice: z.number().int().nonnegative(),
  reportedDate: z.string().min(1),
});
export type HiraBaselineItem = z.infer<typeof HiraBaselineItemSchema>;

export const HospitalComparisonSummarySchema = z.object({
  hospitalId: z.string().min(1),
  slug: z.string().min(1),
  ykiho: z.string().nullable(),
  name: z.string().min(1),
  department: TreatmentCategorySchema,
  sido: z.string().min(1),
  sigungu: z.string().min(1),
  roadAddress: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  rating: z.number().nullable(),
  reviewCount: z.number().int().nonnegative(),
  hiraVerified: z.boolean(),
  hiraBaselineItems: z.array(HiraBaselineItemSchema),
  offers: z.array(NormalizedPriceOfferSchema),
  lowestOffer: NormalizedPriceOfferSchema.nullable(),
  maxSavingsAmount: z.number().int().nonnegative(),
  maxSavingsPercent: z.number().int().nonnegative(),
});
export type HospitalComparisonSummary = z.infer<typeof HospitalComparisonSummarySchema>;

export const BoundsClinicInputSchema = z.object({
  name: z.string().min(1),
  regionHint: z.string().default(''),
  department: z.string().default(''),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type BoundsClinicInput = z.infer<typeof BoundsClinicInputSchema>;

export const BoundsSortBySchema = z.enum(['lowest_price', 'discount_rate', 'rating']);
export type BoundsSortBy = z.infer<typeof BoundsSortBySchema>;

export const BoundsComparisonRequestSchema = z.object({
  clinics: z.array(BoundsClinicInputSchema).max(50),
  department: z.string().optional(),
  treatmentCode: z.string().optional(),
  includeVat: z.boolean().default(true),
  sortBy: BoundsSortBySchema.default('lowest_price'),
});
export type BoundsComparisonRequest = z.infer<typeof BoundsComparisonRequestSchema>;

export const BoundsComparisonResponseSchema = z.object({
  includeVat: z.boolean(),
  sortBy: BoundsSortBySchema,
  matchedCount: z.number().int().nonnegative(),
  items: z.array(HospitalComparisonSummarySchema),
});
export type BoundsComparisonResponse = z.infer<typeof BoundsComparisonResponseSchema>;

export const MatchHospitalQuerySchema = z.object({
  name: z.string().min(1),
  regionHint: z.string().default(''),
  department: z.string().default(''),
  ykiho: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  includeVat: z.boolean().default(true),
});
export type MatchHospitalQuery = z.infer<typeof MatchHospitalQuerySchema>;

export const MatchHospitalResponseSchema = z.object({
  matched: z.boolean(),
  includeVat: z.boolean(),
  hospital: HospitalComparisonSummarySchema.nullable(),
});
export type MatchHospitalResponse = z.infer<typeof MatchHospitalResponseSchema>;
