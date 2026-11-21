import {
  classifyTreatmentName,
  detectVatIncluded,
  evaluateRegionCompatibility,
  formatPriceKRW,
  type RawPlatformOffer,
  scoreNameMatch,
  type TreatmentCategory,
} from '@medi-bridge/shared';

export interface ModoodocTreatmentTag {
  readonly name: string;
  readonly count: number;
}

export type ModoodocPriceBadge = '특가' | '이벤트' | null;

export interface ModoodocPriceItem {
  readonly name: string;
  readonly displayPrice: string;
  readonly originalPrice: string | null;
  readonly discountPercent: number | null;
  readonly badge: ModoodocPriceBadge;
  readonly numericPrice: number;
}

export interface ModoodocHospitalSummary {
  readonly hospitalId: number;
  readonly name: string;
  readonly address: string;
  readonly detailUrl: string;
  readonly totalScore: number | null;
  readonly reviewCount: number;
  readonly topTreatments: readonly ModoodocTreatmentTag[];
  readonly topPrices: readonly ModoodocPriceItem[];
  readonly totalPriceCount: number;
  readonly modoodocOffers?: readonly RawPlatformOffer[];
  readonly hiraOffers?: readonly RawPlatformOffer[];
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface RawCandidateHospital {
  readonly id: number;
  readonly name: string;
  readonly slug: string | null;
  readonly address: string;
  readonly totalScore: number | null;
  readonly reviewCount: number;
  readonly treatments: readonly Record<string, unknown>[];
  readonly treatmentPrices: readonly Record<string, unknown>[];
  readonly hiraTreatmentPrices: readonly Record<string, unknown>[];
}

function parseCandidateObject(value: unknown): RawCandidateHospital | null {
  if (!isRecordObject(value)) {
    return null;
  }

  const rawId = value.id;
  const id = typeof rawId === 'number' ? rawId : Number(rawId);
  if (Number.isNaN(id) || id <= 0) {
    return null;
  }

  const name = typeof value.name === 'string' ? value.name : '';
  if (!name) {
    return null;
  }

  const slug = typeof value.slug === 'string' ? value.slug : null;
  const address = typeof value.address === 'string' ? value.address : '';

  const rawScore = value.totalScore ?? value.score;
  const totalScore = typeof rawScore === 'number' ? rawScore : null;

  const rawReviewCount = value.numOfReview ?? value.reviewCount ?? value.reviewsCount;
  const reviewCount = typeof rawReviewCount === 'number' ? rawReviewCount : 0;

  const treatments = Array.isArray(value.treatments) ? value.treatments.filter(isRecordObject) : [];
  const treatmentPrices = Array.isArray(value.treatmentPrices)
    ? value.treatmentPrices.filter(isRecordObject)
    : [];
  const hiraTreatmentPrices = Array.isArray(value.hiraTreatmentPrices)
    ? value.hiraTreatmentPrices.filter(isRecordObject)
    : [];

  return {
    id,
    name,
    slug,
    address,
    totalScore,
    reviewCount,
    treatments,
    treatmentPrices,
    hiraTreatmentPrices,
  };
}

function parseTreatments(
  rawTreatments: readonly Record<string, unknown>[],
): readonly ModoodocTreatmentTag[] {
  const result: ModoodocTreatmentTag[] = [];

  for (const item of rawTreatments) {
    const rawName = item.name ?? item.treatmentName;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    const rawCount = item.count ?? item.reviewCount;
    const count = typeof rawCount === 'number' ? rawCount : 0;

    if (name && count > 0) {
      result.push({ name, count });
    }
  }

  return result.sort((a, b) => b.count - a.count).slice(0, 3);
}

interface ParsedPriceCandidate {
  readonly item: ModoodocPriceItem;
  readonly originalNumericPrice: number | null;
  readonly hasRange: boolean;
}

function parsePriceCandidate(raw: Record<string, unknown>): ParsedPriceCandidate | null {
  const groupObj = isRecordObject(raw.treatmentGroup) ? raw.treatmentGroup : null;
  const rawName = groupObj?.name ?? raw.name ?? raw.treatmentName;
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!name) {
    return null;
  }

  let badge: ModoodocPriceBadge = null;
  let activePriceObj: Record<string, unknown> | null = null;

  if (isRecordObject(raw.specialPrice) && typeof raw.specialPrice.lowestPrice === 'number') {
    badge = '특가';
    activePriceObj = raw.specialPrice;
  } else if (isRecordObject(raw.eventPrice) && typeof raw.eventPrice.lowestPrice === 'number') {
    badge = '이벤트';
    activePriceObj = raw.eventPrice;
  } else if (isRecordObject(raw.normalPrice) && typeof raw.normalPrice.lowestPrice === 'number') {
    badge = null;
    activePriceObj = raw.normalPrice;
  } else if (
    typeof raw.lowestPrice === 'number' ||
    typeof raw.price === 'number' ||
    typeof raw.amount === 'number'
  ) {
    badge = null;
    activePriceObj = raw;
  }

  if (!activePriceObj) {
    return null;
  }

  const rawLow = activePriceObj.lowestPrice ?? activePriceObj.price ?? activePriceObj.amount;
  const lowestPrice = typeof rawLow === 'number' ? rawLow : 0;
  const rawHigh = activePriceObj.highestPrice;
  const highestPrice = typeof rawHigh === 'number' ? rawHigh : lowestPrice;
  const hasRange = highestPrice > lowestPrice;

  const formattedPrice = lowestPrice > 0 ? formatPriceKRW(lowestPrice) : '0원';
  const displayPrice = hasRange && lowestPrice > 0 ? `${formattedPrice}~` : formattedPrice;

  let originalPrice: string | null = null;
  let originalNumericPrice: number | null = null;
  let discountPercent: number | null = null;
  if (
    badge !== null &&
    isRecordObject(raw.normalPrice) &&
    typeof raw.normalPrice.lowestPrice === 'number' &&
    raw.normalPrice.lowestPrice > lowestPrice
  ) {
    const normalLow = raw.normalPrice.lowestPrice;
    originalNumericPrice = normalLow;
    originalPrice = formatPriceKRW(normalLow);
    if (lowestPrice > 0) {
      discountPercent = Math.round(((normalLow - lowestPrice) / normalLow) * 100);
    }
  }

  return {
    item: {
      name,
      displayPrice,
      originalPrice,
      discountPercent,
      badge,
      numericPrice: lowestPrice,
    },
    originalNumericPrice,
    hasRange,
  };
}

function buildPlatformOffers(
  candidates: readonly ParsedPriceCandidate[],
  platform: 'modoodoc' | 'hira',
  hospitalId: number,
  detailUrl: string,
  categoryHint?: TreatmentCategory,
): RawPlatformOffer[] {
  const offers: RawPlatformOffer[] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (!candidate || candidate.item.numericPrice <= 0) {
      continue;
    }
    const standard = classifyTreatmentName(candidate.item.name, categoryHint);
    offers.push({
      id: `${platform}-${hospitalId}-${index}`,
      platform,
      treatmentCode: standard.code,
      treatmentName: standard.label,
      rawTitle: candidate.item.name,
      listedPrice: Math.round(candidate.item.numericPrice),
      vatIncluded: platform === 'hira' ? true : detectVatIncluded(candidate.item.name, true),
      badge: platform === 'hira' ? '정가기준' : candidate.item.badge,
      bookingUrl: detailUrl,
      updatedAt: '실시간',
      originalPrice:
        candidate.originalNumericPrice !== null ? Math.round(candidate.originalNumericPrice) : null,
      hasRange: candidate.hasRange,
    });
  }
  return offers;
}

function parseAllPrices(
  treatmentPrices: readonly Record<string, unknown>[],
  hiraTreatmentPrices: readonly Record<string, unknown>[],
  hospitalId: number,
  detailUrl: string,
  categoryHint?: TreatmentCategory,
): {
  topPrices: readonly ModoodocPriceItem[];
  totalPriceCount: number;
  modoodocOffers: readonly RawPlatformOffer[];
  hiraOffers: readonly RawPlatformOffer[];
} {
  const seenNames = new Set<string>();
  const seenHiraNames = new Set<string>();
  const allItems: ModoodocPriceItem[] = [];
  const modoodocCandidates: ParsedPriceCandidate[] = [];
  const hiraCandidates: ParsedPriceCandidate[] = [];

  for (const raw of treatmentPrices) {
    const parsed = parsePriceCandidate(raw);
    if (parsed && !seenNames.has(parsed.item.name)) {
      seenNames.add(parsed.item.name);
      allItems.push(parsed.item);
      modoodocCandidates.push(parsed);
    }
  }

  for (const raw of hiraTreatmentPrices) {
    const parsed = parsePriceCandidate(raw);
    if (!parsed) {
      continue;
    }
    if (!seenHiraNames.has(parsed.item.name)) {
      seenHiraNames.add(parsed.item.name);
      hiraCandidates.push(parsed);
    }
    if (!seenNames.has(parsed.item.name)) {
      seenNames.add(parsed.item.name);
      allItems.push(parsed.item);
    }
  }

  const sorted = [...allItems].sort((a, b) => {
    const aPaid = a.numericPrice > 0 ? 1 : 0;
    const bPaid = b.numericPrice > 0 ? 1 : 0;
    return bPaid - aPaid;
  });

  return {
    topPrices: sorted.slice(0, 3),
    totalPriceCount: allItems.length,
    modoodocOffers: buildPlatformOffers(
      modoodocCandidates,
      'modoodoc',
      hospitalId,
      detailUrl,
      categoryHint,
    ),
    hiraOffers: buildPlatformOffers(hiraCandidates, 'hira', hospitalId, detailUrl, categoryHint),
  };
}

export type ModoodocSearchParseResult =
  | { readonly kind: 'parse_error' }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found'; readonly summary: ModoodocHospitalSummary };

/**
 * 모두닥 검색 결과 HTML의 __NEXT_DATA__에서 대상 병원 요약을 추출합니다.
 */
export function parseModoodocSearchResult(
  html: string,
  targetName: string,
  targetRegionHint = '',
  categoryHint?: TreatmentCategory,
): ModoodocSearchParseResult {
  if (!html || !targetName) {
    return { kind: 'parse_error' };
  }

  const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  const scriptContent = scriptMatch?.[1];
  if (!scriptContent) {
    return { kind: 'parse_error' };
  }

  let nextData: unknown;
  try {
    nextData = JSON.parse(scriptContent);
  } catch {
    return { kind: 'parse_error' };
  }

  if (!isRecordObject(nextData)) {
    return { kind: 'parse_error' };
  }

  const props = isRecordObject(nextData.props) ? nextData.props : null;
  const pageProps = props && isRecordObject(props.pageProps) ? props.pageProps : null;
  const dehydratedState =
    pageProps && isRecordObject(pageProps.dehydratedState) ? pageProps.dehydratedState : null;
  const queries =
    dehydratedState && Array.isArray(dehydratedState.queries) ? dehydratedState.queries : [];

  let rawHospitals: unknown[] = [];
  let sawHospitalList = false;

  for (const query of queries) {
    if (!isRecordObject(query)) {
      continue;
    }
    const state = isRecordObject(query.state) ? query.state : null;
    const data = state && isRecordObject(state.data) ? state.data : null;
    if (!data) {
      continue;
    }

    const isMatchKey = Array.isArray(query.queryKey) && query.queryKey[0] === 'hospitalsWithQuery';
    const hasHospitalList = Array.isArray(data.hospitals);

    if (isMatchKey || hasHospitalList) {
      sawHospitalList = hasHospitalList;
      const regularList = Array.isArray(data.hospitals) ? data.hospitals : [];
      const premiumList = Array.isArray(data.premiumAdHospitals) ? data.premiumAdHospitals : [];
      rawHospitals = [...regularList, ...premiumList];
      break;
    }
  }

  if (!sawHospitalList) {
    return { kind: 'parse_error' };
  }

  if (rawHospitals.length === 0) {
    return { kind: 'not_found' };
  }

  const candidateMap = new Map<number, RawCandidateHospital>();
  for (const raw of rawHospitals) {
    const candidate = parseCandidateObject(raw);
    if (candidate && !candidateMap.has(candidate.id)) {
      candidateMap.set(candidate.id, candidate);
    }
  }

  const scoredCandidates: Array<{
    readonly candidate: RawCandidateHospital;
    readonly score: number;
  }> = [];

  const hasRegionHint = targetRegionHint.trim().length > 0;

  for (const candidate of candidateMap.values()) {
    const slugBase = candidate.slug ? (candidate.slug.split('-')[0] ?? '') : '';
    const nameScore = scoreNameMatch(candidate.name, targetName);
    const slugScore = slugBase ? scoreNameMatch(slugBase, targetName) : 0;
    const bestNameScore = Math.max(nameScore, slugScore);

    if (bestNameScore === 0) {
      continue;
    }

    // 지역 힌트가 비어 있을 때는 분점 전위 일치(80점)로 타 도시 지점을 오매칭하지 않도록 >= 90점만 허용
    if (!hasRegionHint && bestNameScore < 90) {
      continue;
    }

    const regionBonus = evaluateRegionCompatibility(candidate.address, targetRegionHint);
    if (regionBonus === null) {
      continue;
    }

    scoredCandidates.push({
      candidate,
      score: bestNameScore + regionBonus,
    });
  }

  if (scoredCandidates.length === 0) {
    return { kind: 'not_found' };
  }

  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.candidate.reviewCount - a.candidate.reviewCount;
  });

  const best = scoredCandidates[0]?.candidate;
  if (!best) {
    return { kind: 'not_found' };
  }

  const detailUrl = best.slug
    ? `https://www.modoodoc.com/hospital/${best.id}/${encodeURIComponent(best.slug)}`
    : `https://www.modoodoc.com/hospital/${best.id}`;

  const topTreatments = parseTreatments(best.treatments);
  const { topPrices, totalPriceCount, modoodocOffers, hiraOffers } = parseAllPrices(
    best.treatmentPrices,
    best.hiraTreatmentPrices,
    best.id,
    detailUrl,
    categoryHint,
  );

  return {
    kind: 'found',
    summary: {
      hospitalId: best.id,
      name: best.name,
      address: best.address,
      detailUrl,
      totalScore: best.totalScore,
      reviewCount: best.reviewCount,
      topTreatments,
      topPrices,
      totalPriceCount,
      modoodocOffers,
      hiraOffers,
    },
  };
}
