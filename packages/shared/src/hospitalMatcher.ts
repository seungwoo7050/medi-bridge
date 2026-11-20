import type { TreatmentCategory } from './schemas';

const MODOODOC_SEARCH_ENDPOINT = 'https://www.modoodoc.com/hospitals/query-search';
const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g;
const ADDRESS_NOISE_PATTERN = /복사|우편번호|지번|도로명|주소보기/g;

export interface CategoryMatchResult {
  readonly isMedicalTarget: boolean;
  readonly matchedDepartment: string | null;
}

export const TARGET_MEDICAL_KEYWORDS: readonly string[] = [
  '치과',
  '피부과',
  '안과',
  '성형외과',
  '정형외과',
  '산부인과',
  '비뇨의학과',
  '비뇨기과',
  '이비인후과',
  '내과',
  '소아청소년과',
  '소아과',
  '정신건강의학과',
  '신경외과',
  '신경과',
  '재활의학과',
  '마취통증의학과',
  '통증의학과',
  '가정의학과',
  '영상의학과',
  '외과',
  '흉부외과',
  '한의원',
  '한방병원',
  '의원',
  '병원',
  '클리닉',
] as const;

export const EXCLUDED_NON_TARGET_KEYWORDS: readonly string[] = [
  '동물병원',
  '동물메디컬',
  '수의과',
  '약국',
  '한약방',
  '산후조리원',
  '요양원',
  '요양병원',
  '장례식장',
  '의료기기',
  '안경원',
  '보건소',
  '보건지소',
  '헌혈의집',
  '치기공',
  '피부관리',
  '에스테틱',
  '마사지',
  '네일',
] as const;

export function evaluateMedicalCategory(rawCategory: string, placeName = ''): CategoryMatchResult {
  const normalizedCategory = rawCategory.trim();
  const combined = `${normalizedCategory} ${placeName.trim()}`;

  if (normalizedCategory.length === 0) {
    return { isMedicalTarget: false, matchedDepartment: null };
  }

  for (const excluded of EXCLUDED_NON_TARGET_KEYWORDS) {
    if (combined.includes(excluded)) {
      return { isMedicalTarget: false, matchedDepartment: null };
    }
  }

  for (const keyword of TARGET_MEDICAL_KEYWORDS) {
    if (normalizedCategory.includes(keyword)) {
      return { isMedicalTarget: true, matchedDepartment: keyword };
    }
  }

  return { isMedicalTarget: false, matchedDepartment: null };
}

export function normalizeDepartmentCategory(rawDepartment: string): TreatmentCategory {
  const text = rawDepartment.trim();
  if (text.includes('안과')) return '안과';
  if (text.includes('치과')) return '치과';
  if (text.includes('피부')) return '피부과';
  if (text.includes('정형') || text.includes('재활') || text.includes('통증')) return '정형외과';
  if (text.includes('성형')) return '성형외과';
  return '기타';
}

export function normalizeHospitalName(rawName: string): string {
  return rawName.replace(ZERO_WIDTH_PATTERN, '').replace(/\s+/g, ' ').trim();
}

export function normalizeCompareName(name: string): string {
  return name.toLowerCase().replace(/[\s()[\]·-]/g, '');
}

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

export function scoreNameMatch(candidateName: string, targetName: string): number {
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

  // 전위 일치(예: '연세꿈꾸는치과' vs '연세꿈꾸는치과의원 분당점')만 허용해
  // '강남하늘안과의원' ↔ '하늘안과의원' 같은 접두지역 오매칭을 차단
  const shorterStripped =
    candStripped.length <= targetStripped.length ? candStripped : targetStripped;
  if (
    shorterStripped.length >= 4 &&
    (candStripped.startsWith(targetStripped) || targetStripped.startsWith(candStripped))
  ) {
    const nonMedicalShorter = stripCommonMedicalWords(shorterStripped);
    if (nonMedicalShorter.length >= 2) {
      return 80;
    }
  }

  return 0;
}

export function extractRegionHintFromAddress(rawAddress: string): string {
  const cleaned = rawAddress
    .replace(ZERO_WIDTH_PATTERN, '')
    .replace(ADDRESS_NOISE_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return '';
  }

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length === 0) {
    return '';
  }

  return tokens.slice(0, 2).join(' ');
}

export interface ExternalPlatformLink {
  readonly platform: 'gangnamunni' | 'yeoshin' | 'babitalk' | 'goodoc';
  readonly label: string;
  readonly url: string;
}

/**
 * 진료과 특성에 맞춰 동일 병원명·지역 기반 외부 비급여 플랫폼 검색 링크 목록을 생성합니다.
 */
export function buildExternalPlatformLinks(
  hospitalName: string,
  regionHint = '',
  department = '',
): readonly ExternalPlatformLink[] {
  const cleanName = normalizeHospitalName(hospitalName);
  const cleanRegion = extractRegionHintFromAddress(regionHint);
  const regionQuery = cleanRegion ? `${cleanRegion} ${cleanName}` : cleanName;
  const normalizedDept = normalizeDepartmentCategory(department);

  const gangnamunni: ExternalPlatformLink = {
    platform: 'gangnamunni',
    label: '강남언니',
    url: `https://www.gangnamunni.com/events?q=${encodeURIComponent(cleanName)}`,
  };
  const yeoshin: ExternalPlatformLink = {
    platform: 'yeoshin',
    label: '여신티켓',
    url: `https://www.yeoshin.co.kr/search/main?q=${encodeURIComponent(cleanName)}`,
  };
  const babitalk: ExternalPlatformLink = {
    platform: 'babitalk',
    label: '바비톡',
    url: `https://web.babitalk.com/search?keyword=${encodeURIComponent(cleanName)}`,
  };
  const goodoc: ExternalPlatformLink = {
    platform: 'goodoc',
    label: '굿닥',
    url: `https://www.goodoc.co.kr/search?keyword=${encodeURIComponent(regionQuery)}`,
  };

  if (normalizedDept === '피부과' || normalizedDept === '성형외과') {
    return [gangnamunni, yeoshin, babitalk, goodoc];
  }
  if (normalizedDept === '안과' || normalizedDept === '치과') {
    return [gangnamunni, goodoc];
  }
  return [goodoc];
}

export function buildModoodocSearchUrl(hospitalName: string, regionHint = ''): string {
  const cleanName = normalizeHospitalName(hospitalName);
  const cleanRegion = extractRegionHintFromAddress(regionHint);
  const query = cleanRegion ? `${cleanRegion} ${cleanName}` : cleanName;
  const url = new URL(MODOODOC_SEARCH_ENDPOINT);
  url.searchParams.set('search_query', query);
  return url.toString();
}

export function buildHospitalKey(hospitalName: string, regionHint = ''): string {
  const cleanName = normalizeHospitalName(hospitalName);
  const cleanRegion = extractRegionHintFromAddress(regionHint);
  return `${cleanName}::${cleanRegion}`;
}

export const SIDO_MAP: Readonly<Record<string, string>> = {
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

export interface ParsedRegion {
  readonly sido: string | null;
  readonly sigungu: string | null;
  readonly dong: string | null;
}

export function parseAddressTokens(address: string): ParsedRegion {
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

export function haversineDistanceMeters(
  a: { readonly lat: number; readonly lng: number },
  b: { readonly lat: number; readonly lng: number },
): number {
  const earthRadiusMeters = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface ClinicCandidateIdentity {
  readonly name: string;
  readonly roadAddress: string;
  readonly ykiho?: string | null | undefined;
  readonly lat?: number | undefined;
  readonly lng?: number | undefined;
}

export interface ClinicTargetIdentity {
  readonly name: string;
  readonly regionHint: string;
  readonly ykiho?: string | undefined;
  readonly lat?: number | undefined;
  readonly lng?: number | undefined;
}

/**
 * 병원명, 시/도·시/군/구, 심평원 요양기호(ykiho), 위경도 거리를 결합해 매칭 점수를 계산합니다.
 * 지역이나 좌표가 명백히 어긋나는 오매칭 후보는 null로 탈락시킵니다.
 */
export function scoreClinicResolution(
  candidate: ClinicCandidateIdentity,
  target: ClinicTargetIdentity,
): number | null {
  if (target.ykiho && candidate.ykiho && target.ykiho === candidate.ykiho) {
    return 1000;
  }

  const nameScore = scoreNameMatch(candidate.name, target.name);
  if (nameScore === 0) {
    return null;
  }

  const regionBonus = evaluateRegionCompatibility(candidate.roadAddress, target.regionHint);
  if (regionBonus === null) {
    return null;
  }

  let geoBonus = 0;
  if (
    target.lat !== undefined &&
    target.lng !== undefined &&
    candidate.lat !== undefined &&
    candidate.lng !== undefined
  ) {
    const distance = haversineDistanceMeters(
      { lat: target.lat, lng: target.lng },
      { lat: candidate.lat, lng: candidate.lng },
    );
    if (distance > 2_000) {
      return null;
    }
    if (distance <= 250) {
      geoBonus = 30;
    } else if (distance <= 1_000) {
      geoBonus = 15;
    }
  }

  return nameScore + regionBonus + geoBonus;
}
