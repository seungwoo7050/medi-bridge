import {
  type ModoodocHospitalSummary,
  type ModoodocSearchParseResult,
  parseModoodocSearchResult,
} from '@medi-bridge/parsers';
import {
  evaluateRegionCompatibility,
  formatKoreanWon,
  normalizeCompareName,
  stripClinicSuffix,
} from '@medi-bridge/shared';
import type { HospitalPreviewSummary } from '../types/place';

export {
  evaluateRegionCompatibility,
  formatKoreanWon,
  type ModoodocSearchParseResult,
  normalizeCompareName,
  parseModoodocSearchResult,
  stripClinicSuffix,
};

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
    platformLabel: '모두닥',
  };
}
