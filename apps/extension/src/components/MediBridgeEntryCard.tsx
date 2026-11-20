import { buildExternalPlatformLinks, buildModoodocSearchUrl } from '@medi-bridge/shared';
import { BrandInfinityIcon } from '@medi-bridge/ui';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import { getCachedHospitalSummary } from '../domain/bridgeStorage';
import { attachSummaryViaWorker } from '../domain/historyGateway';
import type {
  FetchModoodocSummaryRequest,
  FetchModoodocSummaryResponse,
  ModoodocHospitalSummary,
  OpenModoodocHospitalRequest,
  OpenModoodocHospitalResponse,
} from '../types/place';

export interface MediBridgeEntryCardProps {
  readonly hospitalName: string;
  readonly regionHint: string;
  readonly department: string;
  readonly isSubTab?: boolean;
  readonly onSelect?: () => void;
}

export function MediBridgeEntryCard({
  hospitalName,
  regionHint,
  department,
  isSubTab = false,
  onSelect,
}: MediBridgeEntryCardProps): React.JSX.Element {
  const [summary, setSummary] = useState<ModoodocHospitalSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const effectiveRegion = summary?.address || regionHint;
  const modoodocSearchUrl = buildModoodocSearchUrl(hospitalName, effectiveRegion);
  const platformLinks = useMemo(
    () => buildExternalPlatformLinks(hospitalName, effectiveRegion, department),
    [hospitalName, effectiveRegion, department],
  );

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      // /photo 등 주소 DOM이 없는 뷰에서는 로컬 미스 캐시를 건너뛰고 백그라운드 검색 지역 릴레이로 조회
      if (regionHint.trim().length > 0) {
        const cached = await getCachedHospitalSummary(hospitalName, regionHint);
        if (cancelled) {
          return;
        }
        if (cached.hit) {
          setSummary(cached.summary);
          setLoading(false);
          if (cached.summary !== null) {
            void attachSummaryViaWorker(hospitalName, regionHint, cached.summary);
          }
          return;
        }
      }

      setLoading(true);
      try {
        const req: FetchModoodocSummaryRequest = {
          type: 'FETCH_MODOODOC_SUMMARY',
          hospitalName,
          regionHint,
          department,
        };
        const res = (await browser.runtime.sendMessage(req)) as
          | FetchModoodocSummaryResponse
          | undefined;

        if (!cancelled) {
          setSummary(res?.ok ? (res.summary ?? null) : null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSummary(null);
          setLoading(false);
        }
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [hospitalName, regionHint, department]);

  const handleOpenTarget = (
    event: React.MouseEvent<HTMLAnchorElement>,
    explicitUrl: string,
  ): void => {
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
      regionHint: effectiveRegion,
      department,
      targetUrl: explicitUrl,
    };
    void browser.runtime
      .sendMessage(req)
      .then((res) => {
        const parsed = res as OpenModoodocHospitalResponse | undefined;
        if (!parsed?.ok) {
          onSelect?.();
          window.open(explicitUrl, '_blank', 'noopener,noreferrer');
        }
      })
      .catch(() => {
        onSelect?.();
        window.open(explicitUrl, '_blank', 'noopener,noreferrer');
      });
  };

  const wrapperClassName = isSubTab ? 'mb-wrapper is-subtab' : 'mb-wrapper';

  if (loading) {
    return (
      <div className={wrapperClassName}>
        <a
          href={modoodocSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-slim-badge is-loading"
          onClick={(e) => handleOpenTarget(e, modoodocSearchUrl)}
        >
          <BrandInfinityIcon size={16} />
          <span>메디 브릿지 · 모두닥 가격·리뷰 확인 중...</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    );
  }

  if (summary !== null) {
    const treatments = summary.topTreatments.slice(0, 3);
    const prices = summary.topPrices.slice(0, 4);
    const extraPriceCount = summary.totalPriceCount - prices.length;

    return (
      <div className={wrapperClassName}>
        <section
          className="mb-bento-card"
          aria-label={`${summary.name} 모두닥 인증 리뷰 및 비급여 가격`}
        >
          <div className="mb-card-header">
            <div className="mb-brand-group">
              <span className="mb-logo-pill" aria-hidden="true">
                <BrandInfinityIcon size={15} />
              </span>
              <span className="mb-brand-title">메디 브릿지 · 모두닥</span>
              {summary.totalScore !== null && (
                <span className="mb-rating">★ {summary.totalScore.toFixed(1)}</span>
              )}
              <span className="mb-reviews">
                인증리뷰 {summary.reviewCount.toLocaleString('ko-KR')}건
              </span>
            </div>
            <a
              href={summary.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-primary-cta"
              onClick={(e) => handleOpenTarget(e, summary.detailUrl)}
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
                  <div className="mb-price-left">
                    {price.badge !== null && <span className="mb-price-badge">{price.badge}</span>}
                    <span className="mb-ssr-name">{price.name}</span>
                  </div>
                  <div className="mb-offer-right">
                    {price.discountPercent !== null && price.discountPercent > 0 && (
                      <span className="mb-savings-pill">-{price.discountPercent}%</span>
                    )}
                    {price.originalPrice !== null && (
                      <span className="mb-hira-price">{price.originalPrice}</span>
                    )}
                    <span className="mb-offer-price">{price.displayPrice}</span>
                  </div>
                </div>
              ))}
              {extraPriceCount > 0 && (
                <a
                  href={summary.detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-more-link"
                  onClick={(e) => handleOpenTarget(e, summary.detailUrl)}
                >
                  + 외 {extraPriceCount}개 시술 가격 보기 ↗
                </a>
              )}
            </div>
          )}

          <div className="mb-ext-links-row">
            <span className="mb-ext-links-label">다른 플랫폼 검색</span>
            <div className="mb-ext-links-group">
              {platformLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-ext-chip"
                  onClick={(e) => handleOpenTarget(e, link.url)}
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <section className="mb-fallback-card" aria-label={`${hospitalName} 플랫폼 가격 검색`}>
        <div className="mb-fallback-top">
          <div className="mb-brand-group">
            <span className="mb-logo-pill" aria-hidden="true">
              <BrandInfinityIcon size={14} />
            </span>
            <span className="mb-brand-title">메디 브릿지</span>
            <span className="mb-fallback-note">모두닥 직접 매칭 없음</span>
          </div>
          <a
            href={modoodocSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-fallback-modoodoc"
            onClick={(e) => handleOpenTarget(e, modoodocSearchUrl)}
          >
            모두닥 검색 ↗
          </a>
        </div>
        <div className="mb-ext-links-row">
          <div className="mb-ext-links-group">
            {platformLinks.map((link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-ext-chip"
                onClick={(e) => handleOpenTarget(e, link.url)}
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
