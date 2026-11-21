import {
  classifyTreatmentName,
  detectVatIncluded,
  evaluateRegionCompatibility,
  type RawPlatformOffer,
  scoreNameMatch,
  type TreatmentCategory,
} from '@medi-bridge/shared';
import { isRecordObject, toFiniteNumber, toNonEmptyString, toPositiveInt } from './parserHelpers';

export interface BabitalkMatchedHospital {
  readonly hospitalId: number;
  readonly name: string;
  readonly address: string;
  readonly detailUrl: string;
  readonly rating: number | null;
  readonly reviewCount: number;
}

export type BabitalkHospitalSearchResult =
  | { readonly kind: 'parse_error' }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found'; readonly hospital: BabitalkMatchedHospital };

export type BabitalkHospitalEventsResult =
  | { readonly kind: 'parse_error' }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found'; readonly offers: readonly RawPlatformOffer[] };

/**
 * 바비톡 병원 검색 API 응답(`web-api.babitalk.com/v2/search/hospitals`)에서 대상 병원을 매칭합니다.
 */
export function parseBabitalkHospitalSearch(
  raw: unknown,
  targetName: string,
  targetRegionHint = '',
): BabitalkHospitalSearchResult {
  if (!targetName || !isRecordObject(raw) || !Array.isArray(raw.data)) {
    return { kind: 'parse_error' };
  }

  if (raw.data.length === 0) {
    return { kind: 'not_found' };
  }

  const hasRegionHint = targetRegionHint.trim().length > 0;
  const scored: Array<{ readonly hospital: BabitalkMatchedHospital; readonly score: number }> = [];

  for (const item of raw.data) {
    if (!isRecordObject(item)) {
      continue;
    }
    const id = toPositiveInt(item.id);
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

    const address =
      toNonEmptyString(item.address) ?? (typeof item.region === 'string' ? item.region.trim() : '');
    const regionBonus = evaluateRegionCompatibility(address, targetRegionHint);
    if (regionBonus === null) {
      continue;
    }

    const rating = toFiniteNumber(item.star_avg);
    const reviewCount = Math.max(0, Math.round(toFiniteNumber(item.review_count) ?? 0));

    scored.push({
      hospital: {
        hospitalId: id,
        name,
        address,
        detailUrl: `https://babitalk.com/hospitals/${id}`,
        rating,
        reviewCount,
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
 * 바비톡 병원 이벤트 API 응답(`web-api.babitalk.com/v2/hospitals/{id}/events`)에서 가격 오퍼를 추출합니다.
 */
export function parseBabitalkHospitalEvents(
  raw: unknown,
  hospitalId: number,
  categoryHint?: TreatmentCategory,
): BabitalkHospitalEventsResult {
  if (!isRecordObject(raw) || !Array.isArray(raw.data)) {
    return { kind: 'parse_error' };
  }

  if (raw.data.length === 0) {
    return { kind: 'not_found' };
  }

  const offers: RawPlatformOffer[] = [];
  const seenEventIds = new Set<number>();

  for (const ev of raw.data) {
    if (!isRecordObject(ev)) {
      continue;
    }
    const evHid = toPositiveInt(ev.hid);
    if (evHid !== null && evHid !== hospitalId) {
      continue;
    }

    const eventId = toPositiveInt(ev.id);
    const rawTitle = toNonEmptyString(ev.name);
    if (eventId === null || rawTitle === null || seenEventIds.has(eventId)) {
      continue;
    }

    const discountPrice = toPositiveInt(ev.discount_price);
    const regularPrice = toPositiveInt(ev.price);
    const listedPrice = discountPrice ?? regularPrice;
    if (listedPrice === null || listedPrice <= 0) {
      continue;
    }

    seenEventIds.add(eventId);
    const originalPrice = regularPrice !== null && regularPrice > listedPrice ? regularPrice : null;
    const vatIncluded =
      typeof ev.include_vat === 'boolean' ? ev.include_vat : detectVatIncluded(rawTitle, true);
    const subCatName = toNonEmptyString(ev.sub_category_name) ?? '';
    const standard = classifyTreatmentName(`${rawTitle} ${subCatName}`, categoryHint);
    const isHot = ev.is_hot === 1 || ev.is_hot === true;

    offers.push({
      id: `babitalk-${eventId}`,
      platform: 'babitalk',
      treatmentCode: standard.code,
      treatmentName: standard.label,
      rawTitle,
      listedPrice,
      vatIncluded,
      badge: isHot ? '특가' : '이벤트',
      bookingUrl: `https://babitalk.com/events/${eventId}`,
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
