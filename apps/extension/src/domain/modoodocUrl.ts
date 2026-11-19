const MODOODOC_SEARCH_ENDPOINT = 'https://www.modoodoc.com/hospitals/query-search';

const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g;
const ADDRESS_NOISE_PATTERN = /복사|우편번호|지번|도로명|주소보기/g;

/**
 * 네이버 지도 UI에서 추출한 병원명 문자열의 공백과 보이지 않는 제어 문자를 정제합니다.
 */
export function normalizeHospitalName(rawName: string): string {
  return rawName.replace(ZERO_WIDTH_PATTERN, '').replace(/\s+/g, ' ').trim();
}

/**
 * 도로명/지번 전체 주소 또는 목록 축약 주소에서 검색 정확도를 높이기 위한 상위 2개 지역 토큰을 추출합니다.
 * 예: '서울 강남구 테헤란로 123 4층 복사' -> '서울 강남구'
 * 예: '강남구 역삼동' -> '강남구 역삼동'
 */
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

/**
 * 지역 힌트와 병원명을 조합해 모두닥 병원 검색 URL을 생성합니다.
 */
export function buildModoodocSearchUrl(hospitalName: string, regionHint = ''): string {
  const cleanName = normalizeHospitalName(hospitalName);
  const cleanRegion = extractRegionHintFromAddress(regionHint);

  const query = cleanRegion ? `${cleanRegion} ${cleanName}` : cleanName;
  const url = new URL(MODOODOC_SEARCH_ENDPOINT);
  url.searchParams.set('search_query', query);

  return url.toString();
}

/**
 * 동일 병원 중복 식별 및 최근 조회 히스토리 키 생성을 위한 정규화 키를 반환합니다.
 */
export function buildHospitalKey(hospitalName: string, regionHint = ''): string {
  const cleanName = normalizeHospitalName(hospitalName);
  const cleanRegion = extractRegionHintFromAddress(regionHint);
  return `${cleanName}::${cleanRegion}`;
}
