import type {
  HospitalPreviewSummary,
  ModoodocHospitalSummary,
  ModoodocPriceBadge,
  ModoodocPriceItem,
  ModoodocTreatmentTag,
} from '../types/place';

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * 한국 원화 금액을 읽기 쉬운 만원/원 단위로 포맷팅합니다.
 */
export function formatKoreanWon(amount: number, hasRange = false): string {
  const safeAmount = Math.max(0, Math.floor(amount));
  let formatted: string;

  if (safeAmount === 0) {
    formatted = '0원';
  } else if (safeAmount < 10_000) {
    formatted = `${safeAmount.toLocaleString('ko-KR')}원`;
  } else if (safeAmount < 100_000 && safeAmount % 10_000 !== 0) {
    formatted = `${safeAmount.toLocaleString('ko-KR')}원`;
  } else if (safeAmount % 10_000 === 0) {
    formatted = `${(safeAmount / 10_000).toLocaleString('ko-KR')}만원`;
  } else {
    const man = Math.floor(safeAmount / 10_000);
    const remainder = Math.round((safeAmount % 10_000) / 1_000);
    if (remainder === 10) {
      formatted = `${(man + 1).toLocaleString('ko-KR')}만원`;
    } else if (remainder === 0) {
      formatted = `${man.toLocaleString('ko-KR')}만원`;
    } else {
      formatted = `${man.toLocaleString('ko-KR')}.${remainder}만원`;
    }
  }

  if (hasRange && safeAmount > 0) {
    return `${formatted}~`;
  }
  return formatted;
}

/**
 * 병원명 비교용 정규화 (소문자화, 공백·괄호·중점·하이픈 제거)
 */
export function normalizeCompareName(name: string): string {
  return name.toLowerCase().replace(/[\s()[\]·-]/g, '');
}

/**
 * 병원명 끝의 '의원' 접미사를 제거합니다 (제거 후 3자 이상 남을 때만 적용).
 */
export function stripClinicSuffix(name: string): string {
  if (name.endsWith('의원') && name.length - 2 >= 3) {
    return name.slice(0, -2);
  }
  return name;
}

const COMMON_MEDICAL_WORDS: readonly string[] = [
  '안과',
  '치과',
  '피부과',
  '성형외과',
  '정형외과',
  '내과',
  '이비인후과',
  '비뇨의학과',
  '비뇨기과',
  '산부인과',
  '한의원',
  '한방병원',
  '종합병원',
  '병원',
  '의원',
  '클리닉',
];

function stripCommonMedicalWords(name: string): string {
  let result = name;
  for (const word of COMMON_MEDICAL_WORDS) {
    result = result.replaceAll(word, '');
  }
  return result;
}

function scoreNameMatch(candidateName: string, targetName: string): number {
  const normCand = normalizeCompareName(candidateName);
  const normTarget = normalizeCompareName(targetName);
  if (!normCand || !normTarget) {
    return 0;
  }

  if (normCand === normTarget) {
    return 100;
  }

  const candStripped = stripClinicSuffix(normCand);
  const targetStripped = stripClinicSuffix(normTarget);
  if (candStripped === targetStripped) {
    return 90;
  }

  const shorter = normCand.length <= normTarget.length ? normCand : normTarget;
  const longer = normCand.length <= normTarget.length ? normTarget : normCand;

  if (shorter.length >= 4 && longer.includes(shorter)) {
    const nonMedicalShorter = stripCommonMedicalWords(shorter);
    if (nonMedicalShorter.length >= 2 && longer.includes(nonMedicalShorter)) {
      return 80;
    }
  }

  return 0;
}

const SIDO_MAP: Readonly<Record<string, string>> = {
  서울특별시: '서울',
  서울시: '서울',
  서울: '서울',
  부산광역시: '부산',
  부산시: '부산',
  부산: '부산',
  대구광역시: '대구',
  대구시: '대구',
  대구: '대구',
  인천광역시: '인천',
  인천시: '인천',
  인천: '인천',
  광주광역시: '광주',
  광주시: '광주',
  광주: '광주',
  대전광역시: '대전',
  대전시: '대전',
  대전: '대전',
  울산광역시: '울산',
  울산시: '울산',
  울산: '울산',
  세종특별자치시: '세종',
  세종시: '세종',
  세종: '세종',
  경기도: '경기',
  경기: '경기',
  강원특별자치도: '강원',
  강원도: '강원',
  강원: '강원',
  충청북도: '충북',
  충북: '충북',
  충청남도: '충남',
  충남: '충남',
  전북특별자치도: '전북',
  전라북도: '전북',
  전북: '전북',
  전라남도: '전남',
  전남: '전남',
  경상북도: '경북',
  경북: '경북',
  경상남도: '경남',
  경남: '경남',
  제주특별자치도: '제주',
  제주도: '제주',
  제주: '제주',
};

interface ParsedRegion {
  readonly sido: string | null;
  readonly sigungu: string | null;
  readonly dong: string | null;
}

function parseAddressTokens(address: string): ParsedRegion {
  const cleaned = address
    .replace(/[()·,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return { sido: null, sigungu: null, dong: null };
  }

  const tokens = cleaned.split(' ').filter(Boolean);
  let sido: string | null = null;
  let sigungu: string | null = null;
  let dong: string | null = null;

  for (const token of tokens) {
    if (!sido && token in SIDO_MAP) {
      sido = SIDO_MAP[token] ?? null;
      continue;
    }

    if (!sigungu && (token.endsWith('구') || token.endsWith('군') || token.endsWith('시'))) {
      if (token in SIDO_MAP && !sido) {
        sido = SIDO_MAP[token] ?? null;
      } else {
        sigungu = token;
      }
      continue;
    }

    if (!dong && (token.endsWith('동') || token.endsWith('읍') || token.endsWith('면'))) {
      dong = token.replace(/(\d+)동$/, '동');
    }
  }

  return { sido, sigungu, dong };
}

/**
 * 후보 병원 주소와 검색 대상 지역 힌트의 행정구역 호환성을 검증합니다.
 * - 시/도 또는 시/군/구 불일치 시 null(탈락)
 * - 시/군/구 일치 +25점, 동 일치 +15점
 */
export function evaluateRegionCompatibility(
  candidateAddress: string,
  targetRegionHint: string,
): number | null {
  const targetClean = targetRegionHint.trim();
  if (!targetClean) {
    return 0;
  }

  const candRegion = parseAddressTokens(candidateAddress);
  const targetRegion = parseAddressTokens(targetClean);

  if (candRegion.sido && targetRegion.sido && candRegion.sido !== targetRegion.sido) {
    return null;
  }

  if (candRegion.sigungu && targetRegion.sigungu && candRegion.sigungu !== targetRegion.sigungu) {
    return null;
  }

  let bonus = 0;
  if (candRegion.sigungu && targetRegion.sigungu && candRegion.sigungu === targetRegion.sigungu) {
    bonus += 25;
  }

  if (
    targetRegion.dong &&
    (candRegion.dong === targetRegion.dong || candidateAddress.includes(targetRegion.dong))
  ) {
    bonus += 15;
  }

  return bonus;
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

function parsePriceItem(raw: Record<string, unknown>): ModoodocPriceItem | null {
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

  let originalPrice: string | null = null;
  if (
    badge !== null &&
    isRecordObject(raw.normalPrice) &&
    typeof raw.normalPrice.lowestPrice === 'number' &&
    raw.normalPrice.lowestPrice > lowestPrice
  ) {
    originalPrice = formatKoreanWon(raw.normalPrice.lowestPrice, false);
  }

  return {
    name,
    displayPrice: formatKoreanWon(lowestPrice, hasRange),
    originalPrice,
    badge,
    numericPrice: lowestPrice,
  };
}

function parseAllPrices(
  treatmentPrices: readonly Record<string, unknown>[],
  hiraTreatmentPrices: readonly Record<string, unknown>[],
): { topPrices: readonly ModoodocPriceItem[]; totalPriceCount: number } {
  const seenNames = new Set<string>();
  const allItems: ModoodocPriceItem[] = [];

  for (const raw of treatmentPrices) {
    const item = parsePriceItem(raw);
    if (item && !seenNames.has(item.name)) {
      seenNames.add(item.name);
      allItems.push(item);
    }
  }

  for (const raw of hiraTreatmentPrices) {
    const item = parsePriceItem(raw);
    if (item && !seenNames.has(item.name)) {
      seenNames.add(item.name);
      allItems.push(item);
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
  };
}

export type ModoodocSearchParseResult =
  | { readonly kind: 'parse_error' }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found'; readonly summary: ModoodocHospitalSummary };

/**
 * 모두닥 검색 결과 HTML의 __NEXT_DATA__에서 대상 병원의 평점·리뷰·시술·가격 요약을 추출합니다.
 * 응답 구조를 읽지 못한 경우(parse_error)와 읽었지만 대상 병원이 없는 경우(not_found)를 구분합니다.
 */
export function parseModoodocSearchResult(
  html: string,
  targetName: string,
  targetRegionHint = '',
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

  for (const candidate of candidateMap.values()) {
    const slugBase = candidate.slug ? (candidate.slug.split('-')[0] ?? '') : '';
    const nameScore = scoreNameMatch(candidate.name, targetName);
    const slugScore = slugBase ? scoreNameMatch(slugBase, targetName) : 0;
    const bestNameScore = Math.max(nameScore, slugScore);

    if (bestNameScore === 0) {
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
  const { topPrices, totalPriceCount } = parseAllPrices(
    best.treatmentPrices,
    best.hiraTreatmentPrices,
  );

  const summary: ModoodocHospitalSummary = {
    hospitalId: best.id,
    name: best.name,
    address: best.address,
    detailUrl,
    totalScore: best.totalScore,
    reviewCount: best.reviewCount,
    topTreatments,
    topPrices,
    totalPriceCount,
  };

  return { kind: 'found', summary };
}

/**
 * 구조 오류와 미등록을 구분하지 않고 요약 또는 null만 필요할 때 쓰는 얇은 래퍼입니다.
 */
export function parseModoodocSearchHtml(
  html: string,
  targetName: string,
  targetRegionHint = '',
): ModoodocHospitalSummary | null {
  const result = parseModoodocSearchResult(html, targetName, targetRegionHint);
  return result.kind === 'found' ? result.summary : null;
}

/**
 * 모두닥 상세 요약 정보를 팝업·미리보기용 경량 정보로 변환합니다.
 */
export function toHospitalPreviewSummary(summary: ModoodocHospitalSummary): HospitalPreviewSummary {
  const repTreatment = summary.topPrices[0]?.name ?? summary.topTreatments[0]?.name ?? null;
  const repPrice = summary.topPrices[0]?.displayPrice ?? null;

  return {
    detailUrl: summary.detailUrl,
    totalScore: summary.totalScore,
    reviewCount: summary.reviewCount,
    representativeTreatment: repTreatment,
    representativePrice: repPrice,
  };
}
