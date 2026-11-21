import {
  classifyTreatmentName,
  detectVatIncluded,
  evaluateRegionCompatibility,
  type RawPlatformOffer,
  scoreNameMatch,
  type TreatmentCategory,
} from '@medi-bridge/shared';
import { isRecordObject, toFiniteNumber, toNonEmptyString, toPositiveInt } from './parserHelpers';

export interface YeoshinMatchedHospital {
  readonly hospitalId: number;
  readonly name: string;
  readonly address: string;
  readonly detailUrl: string;
  readonly rating: number | null;
  readonly reviewCount: number;
}

export type YeoshinHospitalSearchResult =
  | { readonly kind: 'parse_error' }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found'; readonly hospital: YeoshinMatchedHospital };

export type YeoshinSalesEventsResult =
  | { readonly kind: 'parse_error' }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found'; readonly offers: readonly RawPlatformOffer[] };

/**
 * 여신티켓 병원 검색 API 응답(`api.yeoshin.co.kr/hospitals/search`)에서 지역 검증을 거쳐 대상 병원을 찾습니다.
 */
export function parseYeoshinHospitalSearch(
  raw: unknown,
  targetName: string,
  targetRegionHint = '',
): YeoshinHospitalSearchResult {
  if (
    !targetName ||
    !isRecordObject(raw) ||
    raw.code !== 'SUCCESS' ||
    !isRecordObject(raw.payload)
  ) {
    return { kind: 'parse_error' };
  }

  const payload = raw.payload;
  if (!Array.isArray(payload.hospitals)) {
    return { kind: 'parse_error' };
  }

  if (payload.hospitals.length === 0) {
    return { kind: 'not_found' };
  }

  const statsMap = new Map<
    number,
    { readonly rating: number | null; readonly reviewCount: number }
  >();
  if (Array.isArray(payload.hospitalStats)) {
    for (const stat of payload.hospitalStats) {
      if (!isRecordObject(stat)) continue;
      const hospitalId = toPositiveInt(stat.hospitalId);
      if (hospitalId === null) continue;
      statsMap.set(hospitalId, {
        rating: toFiniteNumber(stat.starPointAverage),
        reviewCount: Math.max(0, Math.round(toFiniteNumber(stat.reviewCount) ?? 0)),
      });
    }
  }

  const hasRegionHint = targetRegionHint.trim().length > 0;
  const scored: Array<{ readonly hospital: YeoshinMatchedHospital; readonly score: number }> = [];

  for (const item of payload.hospitals) {
    if (!isRecordObject(item)) {
      continue;
    }
    const id = toPositiveInt(item.id ?? item.hospitalId);
    const name = toNonEmptyString(item.name);
    if (id === null || name === null) {
      continue;
    }

    const nameScore = scoreNameMatch(name, targetName);
    if (nameScore === 0) {
      continue;
    }
    if (!hasRegionHint && nameScore < 90) {
      continue;
    }

    const address = typeof item.address === 'string' ? item.address.trim() : '';
    const regionBonus = evaluateRegionCompatibility(address, targetRegionHint);
    if (regionBonus === null) {
      continue;
    }

    const stats = statsMap.get(id);
    scored.push({
      hospital: {
        hospitalId: id,
        name,
        address,
        detailUrl: `https://www.yeoshin.co.kr/hospitals/${id}`,
        rating: stats?.rating ?? null,
        reviewCount: stats?.reviewCount ?? 0,
      },
      score: nameScore + regionBonus,
    });
  }

  if (scored.length === 0) {
    return { kind: 'not_found' };
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.hospital.reviewCount - a.hospital.reviewCount;
  });

  const best = scored[0]?.hospital;
  return best ? { kind: 'found', hospital: best } : { kind: 'not_found' };
}

/**
 * 여신티켓 병원별 시술 이벤트 API 응답(`api.yeoshin.co.kr/hospitals/{id}/sales-events`)에서 KRW 오퍼를 추출합니다.
 */
export function parseYeoshinSalesEvents(
  raw: unknown,
  hospitalId: number,
  categoryHint?: TreatmentCategory,
): YeoshinSalesEventsResult {
  if (!isRecordObject(raw) || raw.code !== 'SUCCESS' || !isRecordObject(raw.payload)) {
    return { kind: 'parse_error' };
  }

  const payload = raw.payload;
  if (!Array.isArray(payload.salesEvents) || !Array.isArray(payload.salesProducts)) {
    return { kind: 'parse_error' };
  }

  if (payload.salesEvents.length === 0 || payload.salesProducts.length === 0) {
    return { kind: 'not_found' };
  }

  const productById = new Map<number, Record<string, unknown>>();
  const productByEventId = new Map<number, Record<string, unknown>>();

  for (const prod of payload.salesProducts) {
    if (!isRecordObject(prod)) continue;
    if (prod.currency !== 'KRW' || prod.view === false) {
      continue;
    }
    const prodId = toPositiveInt(prod.id);
    const eventId = toPositiveInt(prod.salesEventId);
    if (prodId !== null) {
      productById.set(prodId, prod);
    }
    if (eventId !== null && !productByEventId.has(eventId)) {
      productByEventId.set(eventId, prod);
    }
  }

  const bookingUrl = `https://www.yeoshin.co.kr/hospitals/${hospitalId}`;
  const offers: RawPlatformOffer[] = [];
  const seenOfferKeys = new Set<string>();

  for (const rawEvent of payload.salesEvents) {
    if (!isRecordObject(rawEvent)) continue;
    if (rawEvent.trash === true || rawEvent.use === false || rawEvent.view === false) {
      continue;
    }
    const eventId = toPositiveInt(rawEvent.id);
    const eventName = toNonEmptyString(rawEvent.name);
    if (eventId === null || eventName === null) {
      continue;
    }

    const repId = toPositiveInt(rawEvent.representativeSalesProductId);
    const product =
      (repId !== null ? productById.get(repId) : undefined) ?? productByEventId.get(eventId);
    if (!product) {
      continue;
    }

    const discountPrice = toPositiveInt(product.discountPrice);
    const basePrice = toPositiveInt(product.price);
    const listedPrice = discountPrice ?? basePrice;
    if (listedPrice === null || listedPrice <= 0) {
      continue;
    }

    const regularPrice = toPositiveInt(product.oneTimeRegularPrice) ?? basePrice;
    const originalPrice = regularPrice !== null && regularPrice > listedPrice ? regularPrice : null;

    const productName = toNonEmptyString(product.name);
    const rawTitle = productName ?? eventName;
    if (seenOfferKeys.has(rawTitle)) {
      continue;
    }
    seenOfferKeys.add(rawTitle);

    const standard = classifyTreatmentName(`${eventName} ${rawTitle}`, categoryHint);
    const vatIncluded = detectVatIncluded(`${eventName} ${rawTitle}`, true);

    offers.push({
      id: `yeoshin-${eventId}`,
      platform: 'yeoshin',
      treatmentCode: standard.code,
      treatmentName: standard.label,
      rawTitle,
      listedPrice,
      vatIncluded,
      badge: originalPrice !== null ? '특가' : '이벤트',
      bookingUrl,
      updatedAt: '실시간',
      originalPrice,
      hasRange: false,
    });
  }

  if (offers.length === 0) {
    return { kind: 'not_found' };
  }

  return { kind: 'found', offers };
}
