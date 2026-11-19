import {
  computeEffectivePrice,
  computeSavingsVsBaseline,
  formatKoreanWon,
  type HospitalComparisonSummary,
} from '@medi-bridge/shared';
import { BestPriceBadge, BrandInfinityIcon, HiraVerifiedBadge } from '@medi-bridge/ui';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  getBridgeState,
  getCachedHospitalComparison,
  getCachedHospitalSummary,
  setVatIncluded,
  subscribeVatIncluded,
} from '../domain/bridgeStorage';
import { attachComparisonViaWorker, attachSummaryViaWorker } from '../domain/historyGateway';
import { buildModoodocSearchUrl } from '../domain/modoodocUrl';
import type {
  FetchHospitalComparisonRequest,
  FetchHospitalComparisonResponse,
  ModoodocHospitalSummary,
  OpenModoodocHospitalRequest,
} from '../types/place';

export interface MediBridgeEntryCardProps {
  readonly hospitalName: string;
  readonly regionHint: string;
  readonly department: string;
  readonly onSelect?: () => void;
}

export function MediBridgeEntryCard({
  hospitalName,
  regionHint,
  department,
  onSelect,
}: MediBridgeEntryCardProps): React.JSX.Element {
  const [comparison, setComparison] = useState<HospitalComparisonSummary | null>(null);
  const [ssrSummary, setSsrSummary] = useState<ModoodocHospitalSummary | null>(null);
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const searchUrl = buildModoodocSearchUrl(hospitalName, regionHint);

  useEffect(() => {
    void getBridgeState().then((state) => {
      setIncludeVat(state.vatIncluded);
    });
    return subscribeVatIncluded((nextVat) => {
      setIncludeVat(nextVat);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadComparison = async () => {
      const [cachedComp, cachedSsr] = await Promise.all([
        getCachedHospitalComparison(hospitalName, regionHint),
        getCachedHospitalSummary(hospitalName, regionHint),
      ]);
      if (cancelled) return;

      if (cachedComp.hit && cachedComp.comparison !== null) {
        setComparison(cachedComp.comparison);
        setSsrSummary(null);
        setLoading(false);
        void attachComparisonViaWorker(hospitalName, regionHint, cachedComp.comparison);
        return;
      }

      if (cachedSsr.hit && cachedSsr.summary !== null) {
        setComparison(null);
        setSsrSummary(cachedSsr.summary);
        setLoading(false);
        void attachSummaryViaWorker(hospitalName, regionHint, cachedSsr.summary);
        return;
      }

      setLoading(true);
      try {
        const req: FetchHospitalComparisonRequest = {
          type: 'FETCH_HOSPITAL_COMPARISON',
          hospitalName,
          regionHint,
          department,
          includeVat: true,
        };
        const res = (await browser.runtime.sendMessage(req)) as
          | FetchHospitalComparisonResponse
          | undefined;

        if (!cancelled) {
          setComparison(res?.ok ? (res.comparison ?? null) : null);
          setSsrSummary(res?.ok ? (res.ssrSummary ?? null) : null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setComparison(null);
          setSsrSummary(null);
          setLoading(false);
        }
      }
    };

    void loadComparison();

    return () => {
      cancelled = true;
    };
  }, [hospitalName, regionHint, department]);

  const rankedOffers = useMemo(() => {
    if (!comparison) return [];
    const baselineMap: Record<string, number> = {};
    for (const item of comparison.hiraBaselineItems) {
      baselineMap[item.treatmentCode] = item.minPrice;
    }

    const computed = comparison.offers.map((offer) => {
      const effectivePrice = computeEffectivePrice(
        offer.listedPrice,
        offer.vatIncluded,
        includeVat,
      );
      const baseline = baselineMap[offer.treatmentCode] ?? null;
      const { savingsAmount, savingsPercent } = computeSavingsVsBaseline(effectivePrice, baseline);
      return {
        ...offer,
        effectivePrice,
        savingsAmount,
        savingsPercent,
      };
    });

    computed.sort((a, b) => a.effectivePrice - b.effectivePrice);
    return computed;
  }, [comparison, includeVat]);

  const handleToggleVat = () => {
    const next = !includeVat;
    setIncludeVat(next);
    void setVatIncluded(next);
  };

  const handleOpenTarget = (event: React.MouseEvent<HTMLAnchorElement>, explicitUrl: string) => {
    const isPlainLeftClick =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (!isPlainLeftClick) {
      onSelect?.();
      return;
    }
    event.preventDefault();
    const req: OpenModoodocHospitalRequest = {
      type: 'OPEN_MODOODOC_HOSPITAL',
      hospitalName,
      regionHint,
      department,
      targetUrl: explicitUrl,
    };
    void browser.runtime.sendMessage(req).catch(() => {
      onSelect?.();
      window.open(explicitUrl, '_blank', 'noopener,noreferrer');
    });
  };

  if (loading) {
    return (
      <div className="mb-wrapper">
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-slim-badge is-loading"
          onClick={(e) => handleOpenTarget(e, searchUrl)}
        >
          <BrandInfinityIcon size={16} />
          <span>메디 브릿지 · 심평원 및 5개 플랫폼 가격 대조 중...</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    );
  }

  if (comparison !== null) {
    const baseline = comparison.hiraBaselineItems[0];
    const primaryCode = baseline?.treatmentCode ?? rankedOffers[0]?.treatmentCode;
    const primaryOffers = primaryCode
      ? rankedOffers.filter((o) => o.treatmentCode === primaryCode).slice(0, 3)
      : rankedOffers.slice(0, 3);
    const lowest = primaryOffers[0] ?? rankedOffers[0];
    const primaryUrl = lowest?.bookingUrl ?? searchUrl;

    return (
      <div className="mb-wrapper">
        <section
          className="mb-bento-card"
          aria-label={`${comparison.name} 심평원 및 플랫폼 통합 가격 비교`}
        >
          <div className="mb-card-header">
            <div className="mb-brand-group">
              <span className="mb-logo-pill" aria-hidden="true">
                <BrandInfinityIcon size={15} />
              </span>
              <span className="mb-brand-title">MEDI BRIDGE</span>
              {comparison.hiraVerified && <HiraVerifiedBadge compact />}
              {comparison.rating !== null && (
                <span className="mb-rating">
                  ★ {comparison.rating.toFixed(1)} ({comparison.reviewCount.toLocaleString('ko-KR')}
                  )
                </span>
              )}
            </div>

            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-primary-cta"
              onClick={(e) => handleOpenTarget(e, primaryUrl)}
            >
              최저가 확인 ↗
            </a>
          </div>

          <div className="mb-controls-row">
            {baseline && (
              <div className="mb-hira-baseline">
                <span className="mb-hira-label">심평원 {baseline.treatmentName} 정가</span>
                <span className="mb-hira-price">{formatKoreanWon(baseline.minPrice)}</span>
              </div>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={includeVat}
              aria-label="VAT 포함 실질가 전환"
              className={`mb-vat-toggle ${includeVat ? 'is-on' : 'is-off'}`}
              onClick={handleToggleVat}
            >
              {includeVat ? 'VAT 포함 기준' : '플랫폼 표기가 기준'}
            </button>
          </div>

          <div className="mb-offers-list">
            {primaryOffers.map((offer, idx) => (
              <a
                key={offer.id}
                href={offer.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mb-offer-row ${idx === 0 ? 'is-lowest' : ''}`}
                onClick={(e) => handleOpenTarget(e, offer.bookingUrl)}
              >
                <div className="mb-offer-left">
                  <span className="mb-platform-pill">{offer.platformLabel}</span>
                  {idx === 0 && <BestPriceBadge label="최저가" />}
                  {!offer.vatIncluded && (
                    <span className="mb-vat-note">{includeVat ? 'VAT+10% 반영' : 'VAT별도'}</span>
                  )}
                </div>
                <div className="mb-offer-right">
                  {offer.savingsPercent > 0 && (
                    <span className="mb-savings-pill">-{offer.savingsPercent}%</span>
                  )}
                  <span className="mb-offer-price">{formatKoreanWon(offer.effectivePrice)}</span>
                  <span className="mb-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (ssrSummary !== null) {
    const treatments = ssrSummary.topTreatments.slice(0, 3);
    const prices = ssrSummary.topPrices.slice(0, 3);
    const extraPriceCount = ssrSummary.totalPriceCount - prices.length;

    return (
      <div className="mb-wrapper">
        <section
          className="mb-bento-card"
          aria-label={`${ssrSummary.name} 모두닥 인증 리뷰 및 비급여 가격`}
        >
          <div className="mb-card-header">
            <div className="mb-brand-group">
              <span className="mb-logo-pill" aria-hidden="true">
                <BrandInfinityIcon size={15} />
              </span>
              <span className="mb-brand-title">MEDI BRIDGE · 모두닥</span>
              {ssrSummary.totalScore !== null && (
                <span className="mb-rating">★ {ssrSummary.totalScore.toFixed(1)}</span>
              )}
              <span className="mb-reviews">
                인증리뷰 {ssrSummary.reviewCount.toLocaleString('ko-KR')}건
              </span>
            </div>
            <a
              href={ssrSummary.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-primary-cta"
              onClick={(e) => handleOpenTarget(e, ssrSummary.detailUrl)}
            >
              리뷰 보기 ↗
            </a>
          </div>

          {treatments.length > 0 && (
            <div className="mb-tags-row">
              {treatments.map((tag) => (
                <span key={tag.name} className="mb-tag-chip">
                  #{tag.name} {tag.count.toLocaleString('ko-KR')}
                </span>
              ))}
            </div>
          )}

          {prices.length > 0 && (
            <div className="mb-offers-list">
              {prices.map((price) => (
                <div key={price.name} className="mb-offer-row">
                  <span className="mb-ssr-name">{price.name}</span>
                  <div className="mb-offer-right">
                    {price.originalPrice !== null && (
                      <span className="mb-hira-price">{price.originalPrice}</span>
                    )}
                    <span className="mb-offer-price">{price.displayPrice}</span>
                  </div>
                </div>
              ))}
              {extraPriceCount > 0 && (
                <a
                  href={ssrSummary.detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-more-link"
                  onClick={(e) => handleOpenTarget(e, ssrSummary.detailUrl)}
                >
                  + 외 {extraPriceCount}개 가격 확인하기 ↗
                </a>
              )}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="mb-wrapper">
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-slim-badge"
        onClick={(e) => handleOpenTarget(e, searchUrl)}
      >
        <BrandInfinityIcon size={15} />
        <span>메디 브릿지 · 플랫폼 가격 검색</span>
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
