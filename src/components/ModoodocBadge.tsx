import type React from 'react';
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { attachSummaryToRecentHospital, getCachedHospitalSummary } from '../domain/bridgeStorage';
import { buildModoodocSearchUrl } from '../domain/modoodocUrl';
import type {
  FetchModoodocSummaryRequest,
  FetchModoodocSummaryResponse,
  ModoodocHospitalSummary,
} from '../types/place';

export interface ModoodocBadgeProps {
  readonly hospitalName: string;
  readonly regionHint: string;
  readonly department: string;
  readonly onSelect?: () => void;
}

function ModoodocPlusIcon(): React.JSX.Element {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <title>모두닥 아이콘</title>
      <path
        d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8C1.5 11.59 4.41 14.5 8 14.5C11.59 14.5 14.5 11.59 14.5 8C14.5 4.41 11.59 1.5 8 1.5ZM7.25 4.5H8.75V7.25H11.5V8.75H8.75V11.5H7.25V8.75H4.5V7.25H7.25V4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ModoodocBadge({
  hospitalName,
  regionHint,
  department,
  onSelect,
}: ModoodocBadgeProps): React.JSX.Element {
  const [summary, setSummary] = useState<ModoodocHospitalSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const searchUrl = buildModoodocSearchUrl(hospitalName, regionHint);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      const cached = await getCachedHospitalSummary(hospitalName, regionHint);
      if (cancelled) {
        return;
      }

      if (cached.hit) {
        setSummary(cached.summary);
        setLoading(false);
        if (cached.summary !== null) {
          void attachSummaryToRecentHospital(hospitalName, regionHint, cached.summary);
        }
        return;
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

  if (loading) {
    return (
      <div className="modoodoc-bridge-wrapper">
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="modoodoc-bridge-badge is-loading"
          title={`'${hospitalName}' 모두닥 실방문자 영수증 리뷰 검색 (새 탭)`}
          aria-label={`${hospitalName} 모두닥 가격·리뷰 확인 중`}
          onClick={() => {
            onSelect?.();
          }}
        >
          <span className="modoodoc-bridge-icon" aria-hidden="true">
            <ModoodocPlusIcon />
          </span>
          <span className="modoodoc-bridge-label">모두닥 가격·리뷰 확인 중...</span>
          <span className="modoodoc-bridge-arrow" aria-hidden="true">
            ↗
          </span>
        </a>
      </div>
    );
  }

  if (summary !== null) {
    const treatments = summary.topTreatments.slice(0, 3);
    const prices = summary.topPrices.slice(0, 3);
    const extraPriceCount = summary.totalPriceCount - prices.length;

    return (
      <div className="modoodoc-bridge-wrapper">
        <section
          className="modoodoc-bridge-card"
          aria-label={`${summary.name} 모두닥 인증 리뷰 및 비급여 가격`}
        >
          <div className="modoodoc-card-header">
            <div className="modoodoc-card-brand">
              <span className="modoodoc-card-logo" aria-hidden="true">
                <ModoodocPlusIcon />
              </span>
              <span className="modoodoc-card-title">모두닥</span>
              {summary.totalScore !== null && (
                <span className="modoodoc-card-score">★ {summary.totalScore.toFixed(1)}</span>
              )}
              <span className="modoodoc-card-reviews">
                인증리뷰 {summary.reviewCount.toLocaleString('ko-KR')}건
              </span>
            </div>
            <a
              href={summary.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="modoodoc-card-cta"
              onClick={() => {
                onSelect?.();
              }}
            >
              리뷰 보기 ↗
            </a>
          </div>

          {treatments.length > 0 && (
            <div className="modoodoc-card-tags">
              {treatments.map((tag) => (
                <span key={tag.name} className="modoodoc-card-tag">
                  #{tag.name} {tag.count.toLocaleString('ko-KR')}
                </span>
              ))}
            </div>
          )}

          {prices.length > 0 && (
            <div className="modoodoc-card-prices">
              {prices.map((price) => (
                <div key={price.name} className="modoodoc-price-row">
                  <span className="modoodoc-price-name" title={price.name}>
                    {price.name}
                  </span>
                  <div className="modoodoc-price-values">
                    {price.originalPrice !== null && (
                      <span className="modoodoc-price-original">{price.originalPrice}</span>
                    )}
                    {price.badge !== null && (
                      <span
                        className={`modoodoc-price-badge badge-${
                          price.badge === '특가' ? 'special' : 'event'
                        }`}
                      >
                        {price.badge}
                      </span>
                    )}
                    <span className="modoodoc-price-current">{price.displayPrice}</span>
                  </div>
                </div>
              ))}
              {extraPriceCount > 0 && (
                <a
                  href={summary.detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modoodoc-card-more"
                  onClick={() => {
                    onSelect?.();
                  }}
                >
                  + 외 {extraPriceCount}개 가격·리뷰 확인하기 ↗
                </a>
              )}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="modoodoc-bridge-wrapper">
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="modoodoc-bridge-badge"
        title={`'${hospitalName}' 모두닥 실방문자 영수증 리뷰 검색 (새 탭)`}
        aria-label={`${hospitalName} 모두닥 영수증 리뷰 보기`}
        onClick={() => {
          onSelect?.();
        }}
      >
        <span className="modoodoc-bridge-icon" aria-hidden="true">
          <ModoodocPlusIcon />
        </span>
        <span className="modoodoc-bridge-label">모두닥 영수증 리뷰 보기</span>
        <span className="modoodoc-bridge-arrow" aria-hidden="true">
          ↗
        </span>
      </a>
    </div>
  );
}
