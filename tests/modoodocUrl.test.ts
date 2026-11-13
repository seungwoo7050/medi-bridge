import { describe, expect, it } from 'vitest';
import {
  buildHospitalKey,
  buildModoodocSearchUrl,
  extractRegionHintFromAddress,
  normalizeHospitalName,
} from '../src/domain/modoodocUrl';

describe('normalizeHospitalName', () => {
  it('제로폭 문자와 중복 공백을 정제한다', () => {
    expect(normalizeHospitalName('  바른이\u200B치과   의원  ')).toBe('바른이치과 의원');
  });
});

describe('extractRegionHintFromAddress', () => {
  it('전체 도로명 주소에서 시/도 및 시/군/구 상위 2개 토큰만 추출한다', () => {
    expect(extractRegionHintFromAddress('서울 강남구 테헤란로 108 4층 복사 주소보기')).toBe(
      '서울 강남구',
    );
  });

  it('검색 목록의 구/동 축약 주소도 깔끔히 반환한다', () => {
    expect(extractRegionHintFromAddress('강남구 역삼동')).toBe('강남구 역삼동');
  });

  it('빈 주소 입력 시 빈 문자열을 반환한다', () => {
    expect(extractRegionHintFromAddress('   ')).toBe('');
  });
});

describe('buildModoodocSearchUrl', () => {
  it('지역 힌트와 병원명을 합쳐 인코딩된 모두닥 검색 URL을 반환한다', () => {
    const url = buildModoodocSearchUrl('바른이치과의원', '서울 강남구');
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe('https://www.modoodoc.com/hospitals/query-search');
    expect(parsed.searchParams.get('search_query')).toBe('서울 강남구 바른이치과의원');
  });

  it('지역 힌트가 없으면 병원명만으로 쿼리를 생성한다', () => {
    const url = buildModoodocSearchUrl('밝은세상안과의원');
    const parsed = new URL(url);

    expect(parsed.searchParams.get('search_query')).toBe('밝은세상안과의원');
  });
});

describe('buildHospitalKey', () => {
  it('병원명과 지역 힌트를 정규화해 일관된 식별 키를 생성한다', () => {
    expect(buildHospitalKey('  강남연세안과 ', '서울 강남구 테헤란로 1')).toBe(
      '강남연세안과::서울 강남구',
    );
  });
});
