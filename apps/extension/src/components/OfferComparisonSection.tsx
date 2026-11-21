import {
  formatPriceKRW,
  type HospitalComparisonResult,
  rankOffersByEffectivePrice,
} from '@medi-bridge/shared';
import type React from 'react';
import { useMemo, useState } from 'react';

export interface OfferComparisonSectionProps {
  readonly comparison: HospitalComparisonResult;
  readonly includeVat: boolean;
  readonly maxVisible?: number;
  readonly onOpenTarget: (event: React.MouseEvent<HTMLAnchorElement>, url: string) => void;
}

export function OfferComparisonSection({
  comparison,
  includeVat,
  maxVisible,
  onOpenTarget,
}: OfferComparisonSectionProps): React.JSX.Element {
  const [selectedTreatmentCode, setSelectedTreatmentCode] = useState<string>('ALL');
  const [expanded, setExpanded] = useState<boolean>(false);

  const rankedAll = useMemo(
    () => rankOffersByEffectivePrice(comparison.rawOffers, includeVat, comparison.hiraBaselines),
    [comparison.rawOffers, includeVat, comparison.hiraBaselines],
  );

  const treatmentTabs = useMemo(() => {
    const seen = new Map<string, { readonly code: string; readonly label: string }>();
    for (const offer of rankedAll) {
      if (offer.effectivePrice <= 0) {
        continue;
      }
      if (!seen.has(offer.treatmentCode)) {
        seen.set(offer.treatmentCode, {
          code: offer.treatmentCode,
          label: offer.treatmentName,
        });
      }
    }
    return [...seen.values()];
  }, [rankedAll]);

  const activeCode =
    selectedTreatmentCode === 'ALL' ||
    treatmentTabs.some((tab) => tab.code === selectedTreatmentCode)
      ? selectedTreatmentCode
      : 'ALL';

  const filteredOffers = useMemo(() => {
    if (activeCode === 'ALL') {
      return rankedAll;
    }
    return rankedAll.filter((offer) => offer.treatmentCode === activeCode);
  }, [rankedAll, activeCode]);

  const isCapped =
    typeof maxVisible === 'number' && !expanded && filteredOffers.length > maxVisible;
  const visibleOffers = isCapped ? filteredOffers.slice(0, maxVisible) : filteredOffers;
  const hiddenCount = filteredOffers.length - visibleOffers.length;

  if (rankedAll.length === 0) {
    return <p className="mb-empty-offers">매칭된 플랫폼에 공개된 시술 가격표가 아직 없습니다.</p>;
  }

  return (
    <div className="mb-comparison-body">
      {treatmentTabs.length > 1 && (
        <div className="mb-treatment-tabs" role="tablist" aria-label="시술별 최저가 필터">
          <button
            type="button"
            role="tab"
            aria-selected={activeCode === 'ALL'}
            className={`mb-treatment-tab${activeCode === 'ALL' ? ' is-active' : ''}`}
            onClick={() => setSelectedTreatmentCode('ALL')}
          >
            전체 {rankedAll.length}
          </button>
          {treatmentTabs.map((tab) => (
            <button
              key={tab.code}
              type="button"
              role="tab"
              aria-selected={activeCode === tab.code}
              className={`mb-treatment-tab${activeCode === tab.code ? ' is-active' : ''}`}
              onClick={() => setSelectedTreatmentCode(tab.code)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="mb-offers-list">
        {visibleOffers.map((offer) => {
          const priceLabel =
            offer.effectivePrice > 0
              ? `${formatPriceKRW(offer.effectivePrice)}${offer.hasRange ? '~' : ''}`
              : '무료/상담';

          return (
            <a
              key={offer.id}
              href={offer.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-offer-row"
              data-platform={offer.platform}
              onClick={(e) => onOpenTarget(e, offer.bookingUrl)}
            >
              <div className="mb-price-left">
                <span className="mb-platform-pill" data-platform={offer.platform}>
                  {offer.platformLabel}
                </span>
                <span className="mb-ssr-name" title={offer.rawTitle}>
                  {offer.rawTitle}
                </span>
              </div>

              <div className="mb-offer-right">
                {offer.discountPercent > 0 && (
                  <span className="mb-discount-text">-{offer.discountPercent}%</span>
                )}
                {offer.displayOriginalPrice !== null && (
                  <span className="mb-hira-price">
                    {formatPriceKRW(offer.displayOriginalPrice)}
                  </span>
                )}
                <div className="mb-offer-price-col">
                  <span className={`mb-offer-price${offer.isLowest ? ' is-lowest' : ''}`}>
                    {priceLabel}
                  </span>
                  {!offer.vatIncluded && offer.effectivePrice > 0 && (
                    <span className="mb-vat-note">
                      {includeVat ? '부가세 포함' : '부가세 별도'}
                    </span>
                  )}
                </div>
              </div>
            </a>
          );
        })}

        {typeof maxVisible === 'number' && filteredOffers.length > maxVisible && (
          <button
            type="button"
            className="mb-more-link"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? '시술 목록 접기' : `+ 외 ${hiddenCount}개 시술 최저가순 펼치기`}
          </button>
        )}
      </div>
    </div>
  );
}
