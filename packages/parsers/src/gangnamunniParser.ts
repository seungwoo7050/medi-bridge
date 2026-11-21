import {
  classifyTreatmentName,
  detectVatIncluded,
  evaluateRegionCompatibility,
  type RawPlatformOffer,
  scoreNameMatch,
  type TreatmentCategory,
} from '@medi-bridge/shared';
import {
  extractNextDataJson,
  isRecordObject,
  toFiniteNumber,
  toNonEmptyString,
  toPositiveInt,
} from './parserHelpers';

export interface GangnamunniSearchCandidate {
  readonly id: number;
  readonly name: string;
  readonly rating: number | null;
  readonly reviewCount: number;
  readonly sido: string;
  readonly districtName: string;
  readonly score: number;
}

export type GangnamunniSearchCandidatesResult =
  | { readonly kind: 'parse_error' }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found'; readonly candidates: readonly GangnamunniSearchCandidate[] };

export interface GangnamunniHospitalSummary {
  readonly hospitalId: number;
  readonly name: string;
  readonly address: string;
  readonly detailUrl: string;
  readonly rating: number | null;
  readonly reviewCount: number;
  readonly offers: readonly RawPlatformOffer[];
}

export type GangnamunniHospitalDetailResult =
  | { readonly kind: 'parse_error' }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found'; readonly summary: GangnamunniHospitalSummary };

/**
 * 강남언니(unni.app) 검색 HTML의 __NEXT_DATA__에서 대상 병원 후보 최대 2건을 추출합니다.
 * 검색 목록에는 도로명 주소가 누락될 수 있으므로 최종 행정구역 교차 검증은 상세 페이지에서 수행합니다.
 */
export function parseGangnamunniSearchCandidates(
  html: string,
  targetName: string,
  targetRegionHint = '',
): GangnamunniSearchCandidatesResult {
  if (!html || !targetName) {
    return { kind: 'parse_error' };
  }

  const nextData = extractNextDataJson(html);
  const props = nextData && isRecordObject(nextData.props) ? nextData.props : null;
  const pageProps = props && isRecordObject(props.pageProps) ? props.pageProps : null;
  if (!pageProps || !Array.isArray(pageProps.hospitals)) {
    return { kind: 'parse_error' };
  }

  const hasRegionHint = targetRegionHint.trim().length > 0;
  const matched: GangnamunniSearchCandidate[] = [];

  for (const raw of pageProps.hospitals) {
    if (!isRecordObject(raw)) {
      continue;
    }
    const id = toPositiveInt(raw.id);
    const name = toNonEmptyString(raw.name);
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
    if (hasRegionHint && nameScore < 80) {
      continue;
    }

    const sido = typeof raw.sido === 'string' ? raw.sido.trim() : '';
    const districtName = typeof raw.districtName === 'string' ? raw.districtName.trim() : '';
    if (sido && hasRegionHint && evaluateRegionCompatibility(sido, targetRegionHint) === null) {
      continue;
    }

    const rating = toFiniteNumber(raw.rating);
    const reviewCount = Math.max(0, Math.round(toFiniteNumber(raw.reviewCount) ?? 0));

    matched.push({
      id,
      name,
      rating,
      reviewCount,
      sido,
      districtName,
      score: nameScore,
    });
  }

  if (matched.length === 0) {
    return { kind: 'not_found' };
  }

  matched.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.reviewCount - a.reviewCount;
  });

  return {
    kind: 'found',
    candidates: matched.slice(0, 2),
  };
}

/**
 * 강남언니(unni.app) 병원 상세 HTML의 __NEXT_DATA__에서 주소 교차 검증 후 이벤트 가격 목록을 추출합니다.
 */
export function parseGangnamunniHospitalDetail(
  html: string,
  targetName: string,
  targetRegionHint = '',
  categoryHint?: TreatmentCategory,
): GangnamunniHospitalDetailResult {
  if (!html || !targetName) {
    return { kind: 'parse_error' };
  }

  const nextData = extractNextDataJson(html);
  const props = nextData && isRecordObject(nextData.props) ? nextData.props : null;
  const pageProps = props && isRecordObject(props.pageProps) ? props.pageProps : null;
  const data = pageProps && isRecordObject(pageProps.data) ? pageProps.data : null;
  const hospital = data && isRecordObject(data.hospital) ? data.hospital : null;
  if (!data || !hospital || !Array.isArray(data.events)) {
    return { kind: 'parse_error' };
  }

  const hospitalId = toPositiveInt(hospital.hospitalId ?? hospital.id);
  const name = toNonEmptyString(hospital.name);
  if (hospitalId === null || name === null) {
    return { kind: 'parse_error' };
  }

  const hasRegionHint = targetRegionHint.trim().length > 0;
  const nameScore = scoreNameMatch(name, targetName);
  if (nameScore === 0) {
    return { kind: 'not_found' };
  }
  if (!hasRegionHint && nameScore < 90) {
    return { kind: 'not_found' };
  }

  const location = isRecordObject(hospital.location) ? hospital.location : null;
  const rawAddress =
    toNonEmptyString(location?.address) ??
    [toNonEmptyString(location?.sido), toNonEmptyString(location?.sigungu)]
      .filter((token): token is string => token !== null)
      .join(' ');

  if (hasRegionHint && evaluateRegionCompatibility(rawAddress, targetRegionHint) === null) {
    return { kind: 'not_found' };
  }

  const statistic = isRecordObject(hospital.statistic) ? hospital.statistic : null;
  const rating = toFiniteNumber(statistic?.rating);
  const reviewCount = Math.max(0, Math.round(toFiniteNumber(statistic?.reviewCount) ?? 0));
  const detailUrl = `https://unni.app/hospitals/${hospitalId}`;

  const offers: RawPlatformOffer[] = [];
  const seenEventIds = new Set<number>();

  for (const rawEvent of data.events) {
    if (!isRecordObject(rawEvent)) {
      continue;
    }
    const eventId = toPositiveInt(rawEvent.id);
    const title = toNonEmptyString(rawEvent.title);
    const priceObj = isRecordObject(rawEvent.price) ? rawEvent.price : null;
    if (eventId === null || title === null || priceObj === null || seenEventIds.has(eventId)) {
      continue;
    }

    const discounted = toPositiveInt(priceObj.discountedAmount);
    const original = toPositiveInt(priceObj.originalAmount);
    const listedPrice = discounted ?? original;
    if (listedPrice === null || listedPrice <= 0) {
      continue;
    }

    seenEventIds.add(eventId);
    const originalPrice = original !== null && original > listedPrice ? original : null;
    const vatIncluded =
      typeof rawEvent.includeVat === 'boolean'
        ? rawEvent.includeVat
        : detectVatIncluded(title, true);
    const standard = classifyTreatmentName(title, categoryHint);

    offers.push({
      id: `gangnamunni-${eventId}`,
      platform: 'gangnamunni',
      treatmentCode: standard.code,
      treatmentName: standard.label,
      rawTitle: title,
      listedPrice,
      vatIncluded,
      badge: originalPrice !== null ? '특가' : '이벤트',
      bookingUrl: `https://unni.app/events/${eventId}`,
      updatedAt: '실시간',
      originalPrice,
      hasRange: false,
    });
  }

  return {
    kind: 'found',
    summary: {
      hospitalId,
      name,
      address: rawAddress,
      detailUrl,
      rating,
      reviewCount,
      offers,
    },
  };
}
