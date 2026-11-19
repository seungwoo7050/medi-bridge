import {
  classifyTreatmentName,
  detectVatIncluded,
  type OfferBadge,
  PlatformSourceSchema,
  type RawPlatformOffer,
  type TreatmentCategory,
} from '@medi-bridge/shared';
import { z } from 'zod';

const RawExternalOfferItemSchema = z.object({
  id: z.string().min(1),
  platform: PlatformSourceSchema,
  hospitalName: z.string().min(1),
  hospitalAddress: z.string().default(''),
  title: z.string().min(1),
  price: z.number().int().nonnegative(),
  vatIncluded: z.boolean().optional(),
  isFirstVisit: z.boolean().optional(),
  isSpecial: z.boolean().optional(),
  bookingUrl: z.string().url(),
  updatedAt: z.string().default('2026-11-19'),
});

const RawExternalOfferEnvelopeSchema = z.object({
  offers: z.array(RawExternalOfferItemSchema),
});

export interface ParsedExternalPlatformOffer {
  readonly hospitalName: string;
  readonly hospitalAddress: string;
  readonly offer: RawPlatformOffer;
}

export type PlatformOfferParseResult =
  | { readonly kind: 'parse_error'; readonly reason: string }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found'; readonly items: readonly ParsedExternalPlatformOffer[] };

function resolveBadge(isFirstVisit?: boolean, isSpecial?: boolean): OfferBadge {
  if (isFirstVisit) return '첫방문';
  if (isSpecial) return '특가';
  return '이벤트';
}

/**
 * 강남언니·여신티켓·바비톡·굿닥·모두닥 수집 JSON 피드를 표준 시술 코드 및 VAT 정규화 오퍼로 변환합니다.
 */
export function parsePlatformOfferFeed(
  raw: unknown,
  categoryHint?: TreatmentCategory,
): PlatformOfferParseResult {
  const parsed = RawExternalOfferEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    return { kind: 'parse_error', reason: parsed.error.issues[0]?.message ?? 'invalid_offer_feed' };
  }

  if (parsed.data.offers.length === 0) {
    return { kind: 'not_found' };
  }

  const items: ParsedExternalPlatformOffer[] = parsed.data.offers.map((item) => {
    const standard = classifyTreatmentName(item.title, categoryHint);
    const vatIncluded =
      item.vatIncluded !== undefined ? item.vatIncluded : detectVatIncluded(item.title, true);

    return {
      hospitalName: item.hospitalName.trim(),
      hospitalAddress: item.hospitalAddress.trim(),
      offer: {
        id: item.id,
        platform: item.platform,
        treatmentCode: standard.code,
        treatmentName: standard.label,
        rawTitle: item.title.trim(),
        listedPrice: item.price,
        vatIncluded,
        badge: resolveBadge(item.isFirstVisit, item.isSpecial),
        bookingUrl: item.bookingUrl,
        updatedAt: item.updatedAt,
      },
    };
  });

  return { kind: 'found', items };
}
