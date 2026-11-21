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

export interface MediBridgeCompareDrawerProps {
  readonly hospitalName: string;
  readonly regionHint: string;
  readonly department: string;
  readonly onClose: () => void;
  readonly onOfferOpen?: () => void;
}

export function MediBridgeCompareDrawer({
  hospitalName,
  regionHint,
  department,
  onClose,
  onOfferOpen,
}: MediBridgeCompareDrawerProps): React.JSX.Element {
  const [comparison, setComparison] = useState<HospitalComparisonResult | null>(null);
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    void getVatIncluded().then(setIncludeVat);
    return subscribeVatIncluded(setIncludeVat);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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
  const fallbackSearchLinks = useMemo(() => {
    const extLinks = buildExternalPlatformLinks(hospitalName, effectiveRegion, department);
    const matchedSet = new Set(
      (comparison?.matchedPlatforms ?? [])
        .filter((p) => p.status === 'matched')
        .map((p) => p.platform),
    );
    const modoodocUrl = buildModoodocSearchUrl(hospitalName, effectiveRegion);
    const list = extLinks.filter((link) => !matchedSet.has(link.platform));
    if (!matchedSet.has('modoodoc')) {
      return [{ platform: 'modoodoc' as const, label: '모두닥 검색', url: modoodocUrl }, ...list];
    }
    return list;
  }, [comparison?.matchedPlatforms, hospitalName, effectiveRegion, department]);

  const matchedPlatforms = useMemo(
    () =>
      (comparison?.matchedPlatforms ?? []).filter(
        (item) => item.status === 'matched' && item.platform !== 'hira',
      ),
    [comparison?.matchedPlatforms],
  );

  const handleToggleVat = () => {
    const next = !includeVat;
    setIncludeVat(next);
    void setVatIncluded(next);
  };

  const handleOpenTarget = (
    event: React.MouseEvent<HTMLAnchorElement>,
    explicitUrl: string,
  ): void => {
    event.stopPropagation();
    const isPlainLeftClick =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (!isPlainLeftClick) {
      onOfferOpen?.();
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
          onOfferOpen?.();
          window.open(explicitUrl, '_blank', 'noopener,noreferrer');
        }
      })
      .catch(() => {
        onOfferOpen?.();
        window.open(explicitUrl, '_blank', 'noopener,noreferrer');
      });
  };

  return (
    <div className="mb-compare-drawer-backdrop">
      <section className="mb-compare-drawer" aria-label={`${hospitalName} 플랫폼별 최저가 비교`}>
        <header className="mb-drawer-header">
          <div className="mb-drawer-title-group">
            <span className="mb-logo-pill" aria-hidden="true">
              <BrandInfinityIcon size={14} />
            </span>
            <div className="mb-drawer-titles">
              <h2 className="mb-drawer-hospital">{hospitalName}</h2>
              <p className="mb-drawer-meta">
                {[department, effectiveRegion].filter(Boolean).join(' · ') || '최저가순 가격 비교'}
              </p>
            </div>
          </div>

          <div className="mb-drawer-controls">
            <button
              type="button"
              role="switch"
              aria-checked={includeVat}
              className={`mb-vat-toggle${includeVat ? ' is-on' : ''}`}
              onClick={handleToggleVat}
            >
              {includeVat ? '부가세 포함가' : '플랫폼 표기가'}
            </button>
            <button
              type="button"
              className="mb-drawer-close"
              aria-label="가격 비교 닫기"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        <div className="mb-drawer-body">
          {loading ? (
            <p className="mb-drawer-loading">
              모두닥·강남언니·여신티켓·바비톡 가격을 수집해 최저가순으로 정렬하고 있습니다...
            </p>
          ) : comparison !== null ? (
            <>
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

              <OfferComparisonSection
                comparison={comparison}
                includeVat={includeVat}
                onOpenTarget={handleOpenTarget}
              />
            </>
          ) : (
            <p className="mb-empty-offers">
              일치하는 플랫폼 가격표를 찾지 못했습니다. 아래 플랫폼 검색에서 직접 확인해 보세요.
            </p>
          )}
        </div>

        {fallbackSearchLinks.length > 0 && (
          <footer className="mb-ext-links-row">
            <span className="mb-ext-links-label">직접 검색</span>
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
          </footer>
        )}
      </section>
    </div>
  );
}
