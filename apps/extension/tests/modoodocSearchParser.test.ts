import { describe, expect, it } from 'vitest';
import {
  evaluateRegionCompatibility,
  formatKoreanWon,
  normalizeCompareName,
  parseModoodocSearchHtml,
  parseModoodocSearchResult,
  stripClinicSuffix,
  toHospitalPreviewSummary,
} from '../src/adapters/modoodocSearchParser';

function buildMockHtml(queries: readonly unknown[]): string {
  const nextData = {
    props: {
      pageProps: {
        dehydratedState: {
          queries,
        },
      },
    },
  };
  return `<!DOCTYPE html><html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
    nextData,
  )}</script></head><body><div>test</div></body></html>`;
}

describe('formatKoreanWon', () => {
  it('금액 구간별 원/만원 단위와 범위 물결표를 정확히 포맷팅한다', () => {
    expect(formatKoreanWon(0)).toBe('0원');
    expect(formatKoreanWon(0, true)).toBe('0원');
    expect(formatKoreanWon(9500)).toBe('9,500원');
    expect(formatKoreanWon(15000)).toBe('15,000원');
    expect(formatKoreanWon(1980000)).toBe('198만원');
    expect(formatKoreanWon(10000000)).toBe('1,000만원');
    expect(formatKoreanWon(125000)).toBe('12.5만원');
    expect(formatKoreanWon(4050000, true)).toBe('405만원~');
  });
});

describe('normalizeCompareName & stripClinicSuffix', () => {
  it('공백·괄호·중점 제거 및 3자 이상일 때만 의원 접미사를 제거한다', () => {
    expect(normalizeCompareName(' 강남 (밝은) 안과·의원-본점 ')).toBe('강남밝은안과의원본점');
    expect(stripClinicSuffix('강남케이안과의원')).toBe('강남케이안과');
    expect(stripClinicSuffix('미의원')).toBe('미의원');
  });
});

describe('evaluateRegionCompatibility', () => {
  it('시/도 및 시/군/구 호환성을 검증하고 일치 점수를 반환한다', () => {
    expect(evaluateRegionCompatibility('서울 강남구 역삼1동', '')).toBe(0);
    expect(evaluateRegionCompatibility('부산 해운대구 우동', '서울 강남구')).toBeNull();
    expect(evaluateRegionCompatibility('서울 서초구 반포동', '서울 강남구')).toBeNull();
    expect(evaluateRegionCompatibility('서울 강남구 테헤란로 123', '서울 강남구')).toBe(25);
    expect(evaluateRegionCompatibility('서울 강남구 역삼1동', '서울 강남구 역삼동')).toBe(40);
  });
});

describe('parseModoodocSearchHtml', () => {
  it('상단 타 병원을 건너뛰고 대상 병원의 평점·리뷰·시술·특가가격을 정확히 파싱한다', () => {
    const html = buildMockHtml([
      {
        queryKey: ['hospitalsWithQuery', { searchQuery: '서울 강남구 강남조은눈안과의원' }],
        state: {
          data: {
            hospitals: [
              {
                id: 4550,
                name: 'YK안과의원',
                slug: 'yk안과의원-서울-삼성동',
                address: '서울 강남구 삼성2동',
                numOfReview: 20,
                totalScore: 8.6,
                treatments: [{ name: '인공눈물 처방', count: 4 }],
                treatmentPrices: [],
                hiraTreatmentPrices: [],
              },
              {
                id: 4695,
                name: '강남조은눈안과의원',
                slug: '강남조은눈안과의원-서울-역삼동',
                address: '서울 강남구 역삼1동',
                numOfReview: 3487,
                totalScore: 9.8,
                treatments: [
                  { name: '라섹', count: 196 },
                  { name: '스마일라식', count: 1939 },
                  { name: '시력교정술 검진', count: 148 },
                  { name: '스마일프로', count: 890 },
                ],
                treatmentPrices: [
                  {
                    treatmentGroup: { name: '시력교정술 검진' },
                    normalPrice: { lowestPrice: 0, highestPrice: 0 },
                    eventPrice: null,
                    specialPrice: null,
                  },
                  {
                    treatmentGroup: { name: '스마일라식' },
                    normalPrice: { lowestPrice: 3800000, highestPrice: 3800000 },
                    eventPrice: { lowestPrice: 2100000, highestPrice: 2100000 },
                    specialPrice: { lowestPrice: 1980000, highestPrice: 1980000 },
                  },
                  {
                    treatmentGroup: { name: '스마일프로' },
                    normalPrice: { lowestPrice: 5000000, highestPrice: 5000000 },
                    eventPrice: { lowestPrice: 4100000, highestPrice: 4100000 },
                    specialPrice: null,
                  },
                  {
                    treatmentGroup: { name: '렌즈삽입술' },
                    normalPrice: { lowestPrice: 6000000, highestPrice: 6000000 },
                    eventPrice: { lowestPrice: 4050000, highestPrice: 4800000 },
                    specialPrice: null,
                  },
                ],
                hiraTreatmentPrices: [],
              },
            ],
            premiumAdHospitals: [],
          },
        },
      },
    ]);

    const summary = parseModoodocSearchHtml(html, '강남조은눈안과의원', '서울 강남구');
    expect(summary).not.toBeNull();
    if (!summary) return;

    expect(summary.hospitalId).toBe(4695);
    expect(summary.totalScore).toBe(9.8);
    expect(summary.reviewCount).toBe(3487);
    expect(summary.detailUrl).toBe(
      `https://www.modoodoc.com/hospital/4695/${encodeURIComponent('강남조은눈안과의원-서울-역삼동')}`,
    );
    expect(summary.topTreatments).toEqual([
      { name: '스마일라식', count: 1939 },
      { name: '스마일프로', count: 890 },
      { name: '라섹', count: 196 },
    ]);
    expect(summary.totalPriceCount).toBe(4);
    expect(summary.topPrices).toEqual([
      {
        name: '스마일라식',
        displayPrice: '198만원',
        originalPrice: '380만원',
        badge: '특가',
        numericPrice: 1980000,
      },
      {
        name: '스마일프로',
        displayPrice: '410만원',
        originalPrice: '500만원',
        badge: '이벤트',
        numericPrice: 4100000,
      },
      {
        name: '렌즈삽입술',
        displayPrice: '405만원~',
        originalPrice: '600만원',
        badge: '이벤트',
        numericPrice: 4050000,
      },
    ]);
  });

  it('가격표가 없는 일반 동네 의원은 topPrices=[]이고 topTreatments만 깔끔하게 반환한다', () => {
    const html = buildMockHtml([
      {
        queryKey: ['hospitalsWithQuery'],
        state: {
          data: {
            hospitals: [
              {
                id: 4550,
                name: 'YK안과의원',
                slug: 'yk안과의원-서울-삼성동',
                address: '서울 강남구 삼성2동',
                numOfReview: 20,
                totalScore: 8.6,
                treatments: [
                  { name: '인공눈물 처방', count: 4 },
                  { name: '드림렌즈', count: 2 },
                ],
                treatmentPrices: [],
                hiraTreatmentPrices: [],
              },
            ],
          },
        },
      },
    ]);

    const summary = parseModoodocSearchHtml(html, 'YK안과의원', '서울 강남구');
    expect(summary).not.toBeNull();
    if (!summary) return;

    expect(summary.topPrices).toEqual([]);
    expect(summary.totalPriceCount).toBe(0);
    expect(summary.topTreatments).toHaveLength(2);
    expect(toHospitalPreviewSummary(summary)).toEqual({
      detailUrl: summary.detailUrl,
      totalScore: 8.6,
      reviewCount: 20,
      representativeTreatment: '인공눈물 처방',
      representativePrice: null,
      platformLabel: '모두닥',
    });
  });

  it('이름이 같아도 시/군/구가 다르거나 단순 진료과 단어만 겹치면 null을 반환한다', () => {
    const html = buildMockHtml([
      {
        queryKey: ['hospitalsWithQuery'],
        state: {
          data: {
            hospitals: [
              {
                id: 2002,
                name: '연세바른치과의원',
                address: '부산 해운대구 우동',
                numOfReview: 12,
                totalScore: 9.2,
              },
              {
                id: 3003,
                name: '강남안과의원',
                address: '서울 강남구 역삼동',
                numOfReview: 5,
                totalScore: 9.0,
              },
            ],
          },
        },
      },
    ]);

    expect(parseModoodocSearchHtml(html, '연세바른치과의원', '서울 강남구')).toBeNull();
    expect(parseModoodocSearchHtml(html, '안과의원', '서울 강남구')).toBeNull();
  });

  it('NEXT_DATA가 없거나 잘못된 HTML에서는 예외 없이 null을 반환한다', () => {
    expect(parseModoodocSearchHtml('<html><body>empty</body></html>', '강남안과')).toBeNull();
    expect(
      parseModoodocSearchHtml('<script id="__NEXT_DATA__">{invalid</script>', '강남안과'),
    ).toBeNull();
  });
});

describe('parseModoodocSearchResult', () => {
  const emptyListQuery = {
    queryKey: ['hospitalsWithQuery', { searchQuery: '서울 강남구 없는의원' }],
    state: { data: { hospitals: [], premiumAdHospitals: [] } },
  };

  it('HTML이나 JSON이 깨졌거나 병원 목록 쿼리가 없으면 parse_error다', () => {
    expect(parseModoodocSearchResult('', '강남안과', '서울 강남구')).toEqual({
      kind: 'parse_error',
    });
    expect(
      parseModoodocSearchResult('<html><body>empty</body></html>', '강남안과', '서울 강남구'),
    ).toEqual({ kind: 'parse_error' });
    expect(
      parseModoodocSearchResult('<script id="__NEXT_DATA__">{invalid</script>', '강남안과'),
    ).toEqual({ kind: 'parse_error' });
    expect(
      parseModoodocSearchResult(
        buildMockHtml([{ queryKey: ['mddCommonInfoQuery'], state: { data: { commInfo: {} } } }]),
        '강남안과',
        '서울 강남구',
      ),
    ).toEqual({ kind: 'parse_error' });
  });

  it('병원 목록은 있는데 대상이 없으면 not_found다', () => {
    expect(
      parseModoodocSearchResult(buildMockHtml([emptyListQuery]), '없는의원', '서울 강남구'),
    ).toEqual({ kind: 'not_found' });

    const otherHospital = {
      queryKey: ['hospitalsWithQuery', {}],
      state: {
        data: {
          hospitals: [
            {
              id: 1,
              name: 'YK안과의원',
              slug: 'yk안과의원-서울-삼성동',
              address: '서울 강남구 삼성2동',
            },
          ],
          premiumAdHospitals: [],
        },
      },
    };
    expect(
      parseModoodocSearchResult(buildMockHtml([otherHospital]), '강남케이안과의원', '서울 강남구'),
    ).toEqual({ kind: 'not_found' });
  });

  it('parseModoodocSearchHtml은 parse_error와 not_found를 모두 null로 돌려준다', () => {
    expect(parseModoodocSearchHtml('', '강남안과')).toBeNull();
    expect(parseModoodocSearchHtml(buildMockHtml([emptyListQuery]), '없는의원')).toBeNull();
  });
});
