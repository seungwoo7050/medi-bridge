import { buildExternalPlatformLinks, buildModoodocSearchUrl } from '@medi-bridge/shared';
import { BrandInfinityIcon } from '@medi-bridge/ui';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  getCachedHospitalComparison,
  getVatIncluded,
  setVatIncluded,
  subscribeVatIncluded,
} from '../domain/bridgeStorage';
import { attachComparisonViaWorker } from '../domain/historyGateway';
import type {
  FetchHospitalComparisonRequest,
  FetchHospitalComparisonResponse,
  HospitalComparisonResult,
  OpenPlatformTargetRequest,
  OpenPlatformTargetResponse,
} from '../types/place';
import { OfferComparisonSection } from './OfferComparisonSection';

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
  const [comparison, setComparison] = useState<HospitalComparisonResult | null>(null);
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    void getVatIncluded().then(setIncludeVat);
    return subscribeVatIncluded(setIncludeVat);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadComparison = async () => {
      if (regionHint.trim().length > 0) {
        const cached = await getCachedHospitalComparison(hospitalName, regionHint);
        if (cancelled) {
          return;
        }
        if (cached.hit) {
          setComparison(cached.comparison);
          setLoading(false);
          if (cached.comparison !== null) {
            void attachComparisonViaWorker(hospitalName, regionHint, cached.comparison);
          }
          return;
        }
      }

      setLoading(true);
      try {
        const req: FetchHospitalComparisonRequest = {
          type: 'FETCH_HOSPITAL_COMPARISON',
          hospitalName,
          regionHint,
          department,
        };
        const res = (await browser.runtime.sendMessage(req)) as
          | FetchHospitalComparisonResponse
          | undefined;

        if (!cancelled) {
          setComparison(res?.ok ? (res.comparison ?? null) : null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setComparison(null);
          setLoading(false);
        }
      }
    };

    void loadComparison();
    return () => {
      cancelled = true;
    };
  }, [hospitalName, regionHint, department]);

  const effectiveRegion = comparison?.regionHint || regionHint;
  const modoodocSearchUrl = buildModoodocSearchUrl(hospitalName, effectiveRegion);

  const matchedPlatforms = useMemo(
    () =>
      (comparison?.matchedPlatforms ?? []).filter(
        (item) => item.status === 'matched' && item.platform !== 'hira',
      ),
    [comparison?.matchedPlatforms],
  );

  const fallbackSearchLinks = useMemo(() => {
    const extLinks = buildExternalPlatformLinks(hospitalName, effectiveRegion, department);
    const matchedSet = new Set(matchedPlatforms.map((p) => p.platform));
    const remaining = extLinks.filter((link) => !matchedSet.has(link.platform));
    if (!matchedSet.has('modoodoc')) {
      return [
        { platform: 'modoodoc' as const, label: '모두닥 검색', url: modoodocSearchUrl },
        ...remaining,
      ];
    }
    return remaining;
  }, [matchedPlatforms, hospitalName, effectiveRegion, department, modoodocSearchUrl]);

  const handleToggleVat = () => {
    const next = !includeVat;
    setIncludeVat(next);
    void setVatIncluded(next);
  };

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
    const req: OpenPlatformTargetRequest = {
      type: 'OPEN_PLATFORM_TARGET',
      hospitalName,
      regionHint: effectiveRegion,
      department,
      targetUrl: explicitUrl,
    };
    void browser.runtime
      .sendMessage(req)
      .then((res) => {
        const parsed = res as OpenPlatformTargetResponse | undefined;
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
        <div className="mb-slim-badge is-loading" role="status" aria-live="polite">
          <BrandInfinityIcon size={16} />
          <span>메디 브릿지 · 플랫폼별 가격 수집 및 최저가 정렬 중...</span>
        </div>
      </div>
    );
  }

  if (comparison !== null) {
    return (
      <div className={wrapperClassName}>
        <section
          className="mb-bento-card"
          aria-label={`${comparison.hospitalName} 플랫폼별 최저가 비교`}
        >
          <div className="mb-card-header">
            <div className="mb-brand-group">
              <span className="mb-logo-pill" aria-hidden="true">
                <BrandInfinityIcon size={15} />
              </span>
              <span className="mb-brand-title">메디 브릿지 · 최저가 비교</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeVat}
              className={`mb-vat-toggle${includeVat ? ' is-on' : ''}`}
              onClick={handleToggleVat}
            >
              {includeVat ? '부가세 포함가' : '플랫폼 표기가'}
            </button>
          </div>

          {matchedPlatforms.length > 0 && (
            <div className="mb-matched-platforms">
              {matchedPlatforms.map((item) =>
                item.hospitalUrl ? (
                  <a
                    key={item.platform}
                    href={item.hospitalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-platform-summary-link"
                    onClick={(e) => handleOpenTarget(e, item.hospitalUrl ?? '')}
                  >
                    <span>{item.platformLabel}</span>
                    {item.rating !== null && (
                      <span className="mb-rating">★ {item.rating.toFixed(1)}</span>
                    )}
                    {item.reviewCount > 0 && (
                      <span className="mb-reviews">
                        ({item.reviewCount.toLocaleString('ko-KR')})
                      </span>
                    )}
                    <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span key={item.platform} className="mb-platform-summary-link">
                    {item.platformLabel}
                  </span>
                ),
              )}
            </div>
          )}

          {comparison.topTreatments.length > 0 && (
            <div className="mb-tags-row">
              {comparison.topTreatments.slice(0, 3).map((tag) => (
                <span key={tag.name} className="mb-tag-chip">
                  #{tag.name} {tag.count.toLocaleString('ko-KR')}
                </span>
              ))}
            </div>
          )}

          <OfferComparisonSection
            comparison={comparison}
            includeVat={includeVat}
            maxVisible={5}
            onOpenTarget={handleOpenTarget}
          />

          {fallbackSearchLinks.length > 0 && (
            <div className="mb-ext-links-row">
              <span className="mb-ext-links-label">추가 플랫폼 검색</span>
              <div className="mb-ext-links-group">
                {fallbackSearchLinks.map((link) => (
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
          )}
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
            <span className="mb-fallback-note">직접 수집된 가격표 없음</span>
          </div>
        </div>
        <div className="mb-ext-links-row">
          <div className="mb-ext-links-group">
            {fallbackSearchLinks.map((link) => (
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
