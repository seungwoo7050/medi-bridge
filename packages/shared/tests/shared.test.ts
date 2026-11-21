import { describe, expect, it } from 'vitest';
import {
  buildExternalPlatformLinks,
  classifyTreatmentName,
  computeEffectivePrice,
  detectVatIncluded,
  evaluateMedicalCategory,
  formatPriceKRW,
  rankOffersByEffectivePrice,
  resolveTargetPlatformsForDepartment,
  scoreClinicResolution,
  scoreNameMatch,
} from '../src/index';

describe('VAT normalization and ranking', () => {
  it('adds 10% VAT to VAT-exclusive offers and reverses rank when VAT included is toggled', () => {
    const rawOffers = [
      {
        id: 'offer-gangnamunni',
        platform: 'gangnamunni' as const,
        treatmentCode: 'OPHTH_SMILE',
        treatmentName: '스마일라식',
        rawTitle: '스마일라식 양안 특가 (VAT 별도)',
        listedPrice: 1_950_000,
        vatIncluded: false,
        badge: '특가' as const,
        bookingUrl: 'https://www.gangnamunni.com/events/1',
        updatedAt: '2026-11-19',
      },
      {
        id: 'offer-modoodoc',
        platform: 'modoodoc' as const,
        treatmentCode: 'OPHTH_SMILE',
        treatmentName: '스마일라식',
        rawTitle: '스마일라식 이벤트 (VAT 포함)',
        listedPrice: 2_090_000,
        vatIncluded: true,
        badge: '이벤트' as const,
        bookingUrl: 'https://www.modoodoc.com/hospital/86566',
        updatedAt: '2026-11-19',
      },
    ];

    expect(computeEffectivePrice(1_950_000, false, true)).toBe(2_145_000);
    expect(computeEffectivePrice(2_090_000, true, true)).toBe(2_090_000);

    const vatIncludedRanked = rankOffersByEffectivePrice(rawOffers, true, {
      OPHTH_SMILE: 3_500_000,
    });
    expect(vatIncludedRanked[0]?.platform).toBe('modoodoc');
    expect(vatIncludedRanked[0]?.isLowest).toBe(true);
    expect(vatIncludedRanked[0]?.savingsPercent).toBe(40);

    const vatExcludedRanked = rankOffersByEffectivePrice(rawOffers, false, {
      OPHTH_SMILE: 3_500_000,
    });
    expect(vatExcludedRanked[0]?.platform).toBe('gangnamunni');
    expect(vatExcludedRanked[0]?.isLowest).toBe(true);
  });

  it('places zero-won checkup offers after positive-priced offers and computes discountPercent from originalPrice', () => {
    const offers = [
      {
        id: 'offer-free',
        platform: 'modoodoc' as const,
        treatmentCode: 'DENT_SCALING',
        treatmentName: '치아미백 · 스케일링',
        rawTitle: '초진 무료 검진',
        listedPrice: 0,
        vatIncluded: true,
        badge: null,
        bookingUrl: 'https://www.modoodoc.com/hospital/1',
        updatedAt: '실시간',
      },
      {
        id: 'offer-paid',
        platform: 'babitalk' as const,
        treatmentCode: 'DERM_ULTHERA',
        treatmentName: '울쎄라 리프팅',
        rawTitle: '리프테라2 리프팅',
        listedPrice: 120_000,
        originalPrice: 240_000,
        vatIncluded: true,
        badge: '특가' as const,
        bookingUrl: 'https://babitalk.com/events/1',
        updatedAt: '실시간',
      },
    ];

    const ranked = rankOffersByEffectivePrice(offers, true);
    expect(ranked[0]?.id).toBe('offer-paid');
    expect(ranked[0]?.displayOriginalPrice).toBe(240_000);
    expect(ranked[0]?.discountPercent).toBe(50);
    expect(ranked[1]?.id).toBe('offer-free');
    expect(ranked[1]?.isLowest).toBe(false);
  });
});

describe('treatment classification & VAT detection', () => {
  it('maps heterogeneous event titles to canonical treatment codes and extracts VAT flag', () => {
    expect(classifyTreatmentName('[첫방문] 인모드 FX 풀페이스 1회 (VAT별도)', '피부과').code).toBe(
      'DERM_INMODE',
    );
    expect(detectVatIncluded('[첫방문] 인모드 FX 풀페이스 (VAT별도)')).toBe(false);
    expect(detectVatIncluded('오스템 임플란트 1치 (부가세 포함)')).toBe(true);
  });
});

describe('clinic resolution & medical category filtering', () => {
  it('prioritizes ykiho match and disqualifies cross-district or distant coordinates', () => {
    const exactYkiho = scoreClinicResolution(
      {
        name: '강남케이안과의원',
        roadAddress: '서울 강남구 강남대로 374',
        ykiho: 'JDQ4MTg4MTI1',
        lat: 37.496,
        lng: 127.028,
      },
      {
        name: '다른이름',
        regionHint: '부산 해운대구',
        ykiho: 'JDQ4MTg4MTI1',
      },
    );
    expect(exactYkiho).toBe(1000);

    const wrongSido = scoreClinicResolution(
      {
        name: '연세봄의원',
        roadAddress: '부산광역시 해운대구 해운대로 10',
      },
      {
        name: '연세봄의원',
        regionHint: '서울 강남구',
      },
    );
    expect(wrongSido).toBeNull();

    const tooFarCoords = scoreClinicResolution(
      {
        name: '연세봄의원',
        roadAddress: '서울 강남구 역삼동',
        lat: 37.5,
        lng: 127.03,
      },
      {
        name: '연세봄의원',
        regionHint: '서울 강남구',
        lat: 37.55,
        lng: 127.1,
      },
    );
    expect(tooFarCoords).toBeNull();

    expect(evaluateMedicalCategory('동물병원', '24시센트럴동물병원').isMedicalTarget).toBe(false);
    expect(evaluateMedicalCategory('피부과,레이저', '연세봄피부과의원').matchedDepartment).toBe(
      '피부과',
    );

    expect(scoreNameMatch('연세꿈꾸는치과의원 분당점', '연세꿈꾸는치과의원')).toBe(80);
    expect(scoreNameMatch('강남하늘안과의원', '하늘안과의원')).toBe(0);
    expect(formatPriceKRW(2_090_000)).toBe('2,090,000원');

    const dermLinks = buildExternalPlatformLinks('여름의원', '서울 서초구', '피부과');
    expect(dermLinks.map((l) => l.label)).toEqual(['강남언니', '여신티켓', '바비톡', '굿닥']);
    expect(dermLinks.find((l) => l.platform === 'gangnamunni')?.url).toContain(
      'https://unni.app/search?q=',
    );
    expect(dermLinks.find((l) => l.platform === 'yeoshin')?.url).toContain(
      'https://www.yeoshin.co.kr/search/category?q=',
    );
    expect(dermLinks.find((l) => l.platform === 'babitalk')?.url).toContain(
      'https://babitalk.com/search?keyword=',
    );
    expect(dermLinks.find((l) => l.platform === 'goodoc')?.url).toContain(
      'https://www.goodoc.co.kr/hospitals?keyword=',
    );
    const dentalLinks = buildExternalPlatformLinks('드라마치과병원', '경기 성남시', '치과');
    expect(dentalLinks.map((l) => l.label)).toEqual(['강남언니', '굿닥']);
    const orthoLinks = buildExternalPlatformLinks('서울정형외과', '서울 강남구', '정형외과');
    expect(orthoLinks.map((l) => l.label)).toEqual(['굿닥']);

    expect(resolveTargetPlatformsForDepartment('피부과')).toEqual([
      'modoodoc',
      'gangnamunni',
      'yeoshin',
      'babitalk',
    ]);
    expect(resolveTargetPlatformsForDepartment('치과')).toEqual([
      'modoodoc',
      'gangnamunni',
      'yeoshin',
    ]);
    expect(resolveTargetPlatformsForDepartment('정형외과')).toEqual(['modoodoc']);
  });
});
