import {
  type NormalizedPriceOffer,
  PLATFORM_LABELS,
  type PlatformSource,
  type RawPlatformOffer,
} from './schemas';

const VAT_MULTIPLIER = 1.1;

/**
 * 웹·확장 비교 UI 전반에서 천 단위 콤마가 포함된 원화 문자열(`1,350,000원`)로 통일해 반환합니다.
 */
export function formatPriceKRW(price: number): string {
  return `${Math.max(0, Math.round(price)).toLocaleString('ko-KR')}원`;
}

/**
 * 한국 원화 금액을 읽기 쉬운 만원/원 단위로 포맷팅합니다.
 */
export function formatKoreanWon(amount: number, hasRange = false): string {
  const safeAmount = Math.max(0, Math.round(amount));
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
 * 표기 금액과 VAT 포함 여부를 바탕으로 비교 기준(VAT 포함 실질가 vs 플랫폼 표기가 원액) 금액을 계산합니다.
 * - displayIncludeVat=true: VAT 별도 표기 가격에 10%를 가산해 실질 결제 금액으로 통일합니다.
 * - displayIncludeVat=false: 각 플랫폼이 광고하는 표기가 원액 그대로를 반환합니다.
 */
export function computeEffectivePrice(
  listedPrice: number,
  vatIncluded: boolean,
  displayIncludeVat = true,
): number {
  const safePrice = Math.max(0, Math.round(listedPrice));
  if (displayIncludeVat) {
    return vatIncluded ? safePrice : Math.round(safePrice * VAT_MULTIPLIER);
  }
  return safePrice;
}

export function computeSavingsVsBaseline(
  effectivePrice: number,
  hiraBaselinePrice: number | null,
): { readonly savingsAmount: number; readonly savingsPercent: number } {
  if (hiraBaselinePrice === null || hiraBaselinePrice <= 0 || effectivePrice <= 0) {
    return { savingsAmount: 0, savingsPercent: 0 };
  }
  const savingsAmount = Math.max(0, hiraBaselinePrice - effectivePrice);
  const savingsPercent = Math.max(0, Math.round((savingsAmount / hiraBaselinePrice) * 100));
  return { savingsAmount, savingsPercent };
}

const PLATFORM_PRIORITY: Readonly<Record<PlatformSource, number>> = {
  modoodoc: 1,
  gangnamunni: 2,
  yeoshin: 3,
  babitalk: 4,
  goodoc: 5,
  hira: 99,
};

/**
 * 다중 플랫폼 오퍼를 VAT 정규화 가격 오름차순으로 정렬하고 최저가·절감율 메타를 부착합니다.
 */
export function rankOffersByEffectivePrice(
  offers: readonly RawPlatformOffer[],
  displayIncludeVat: boolean,
  baselineByTreatmentCode: Readonly<Record<string, number>> = {},
): NormalizedPriceOffer[] {
  const mapped: NormalizedPriceOffer[] = offers.map((offer) => {
    const effectiveIncluded = computeEffectivePrice(offer.listedPrice, offer.vatIncluded, true);
    const effectiveExcluded = computeEffectivePrice(offer.listedPrice, offer.vatIncluded, false);
    const effectivePrice = displayIncludeVat ? effectiveIncluded : effectiveExcluded;
    const hiraBaselinePrice = baselineByTreatmentCode[offer.treatmentCode] ?? null;
    const rawOriginal =
      typeof offer.originalPrice === 'number' && offer.originalPrice > offer.listedPrice
        ? offer.originalPrice
        : null;
    const computedOriginal =
      rawOriginal !== null
        ? computeEffectivePrice(rawOriginal, offer.vatIncluded, displayIncludeVat)
        : null;
    const displayOriginalPrice =
      computedOriginal !== null && computedOriginal > effectivePrice
        ? computedOriginal
        : hiraBaselinePrice !== null && hiraBaselinePrice > effectivePrice
          ? hiraBaselinePrice
          : null;
    const { savingsAmount, savingsPercent } = computeSavingsVsBaseline(
      effectivePrice,
      hiraBaselinePrice,
    );
    const discountPercent =
      displayOriginalPrice !== null && displayOriginalPrice > effectivePrice && effectivePrice > 0
        ? Math.round(((displayOriginalPrice - effectivePrice) / displayOriginalPrice) * 100)
        : Math.max(0, savingsPercent);

    return {
      ...offer,
      platformLabel: PLATFORM_LABELS[offer.platform],
      effectivePrice,
      effectivePriceVatIncluded: effectiveIncluded,
      effectivePriceVatExcluded: effectiveExcluded,
      hiraBaselinePrice,
      displayOriginalPrice,
      discountPercent,
      savingsAmount,
      savingsPercent,
      isLowest: false,
    };
  });

  mapped.sort((a, b) => {
    const aZero = a.effectivePrice <= 0 ? 1 : 0;
    const bZero = b.effectivePrice <= 0 ? 1 : 0;
    if (aZero !== bZero) {
      return aZero - bZero;
    }
    if (a.effectivePrice !== b.effectivePrice) {
      return a.effectivePrice - b.effectivePrice;
    }
    return PLATFORM_PRIORITY[a.platform] - PLATFORM_PRIORITY[b.platform];
  });

  const nonHiraMinByTreatment = new Map<string, number>();
  for (const item of mapped) {
    if (item.platform === 'hira' || item.effectivePrice <= 0) {
      continue;
    }
    const cur = nonHiraMinByTreatment.get(item.treatmentCode);
    if (cur === undefined || item.effectivePrice < cur) {
      nonHiraMinByTreatment.set(item.treatmentCode, item.effectivePrice);
    }
  }

  return mapped.map((item) => {
    const minForTreatment = nonHiraMinByTreatment.get(item.treatmentCode);
    const isLowest =
      item.platform !== 'hira' &&
      minForTreatment !== undefined &&
      item.effectivePrice === minForTreatment;
    return {
      ...item,
      isLowest,
    };
  });
}
