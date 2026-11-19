import {
  type BoundsSortBy,
  formatKoreanWon,
  type HospitalComparisonSummary,
} from '@medi-bridge/shared';
import {
  BestPriceBadge,
  BrandInfinityIcon,
  EmptySearchGraphic,
  HiraVerifiedBadge,
} from '@medi-bridge/ui';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getBridgeState, setVatIncluded, subscribeVatIncluded } from '../domain/bridgeStorage';
import type {
  CompareBoundsClinicsRequest,
  CompareBoundsClinicsResponse,
  ExtractedSearchListHospital,
} from '../types/place';

export interface RadiusCompareDrawerProps {
  readonly hospitals: readonly ExtractedSearchListHospital[];
}

export function RadiusCompareDrawer({ hospitals }: RadiusCompareDrawerProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<BoundsSortBy>('lowest_price');
  const [loading, setLoading] = useState<boolean>(false);
  const [items, setItems] = useState<readonly HospitalComparisonSummary[]>([]);

  useEffect(() => {
    void getBridgeState().then((s) => setIncludeVat(s.vatIncluded));
    return subscribeVatIncluded((next) => setIncludeVat(next));
  }, []);

  const fetchBoundsComparison = useCallback(
    async (vatFlag: boolean, sort: BoundsSortBy) => {
      if (hospitals.length === 0) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const req: CompareBoundsClinicsRequest = {
          type: 'COMPARE_BOUNDS_CLINICS',
          clinics: hospitals.slice(0, 50).map((h) => ({
            name: h.name,
            regionHint: h.regionHint,
            department: h.matchedDepartment,
          })),
          includeVat: vatFlag,
          sortBy: sort,
        };
        const res = (await browser.runtime.sendMessage(req)) as
          | CompareBoundsClinicsResponse
          | undefined;
        setItems(res?.ok ? res.items : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [hospitals],
  );

  const handleOpenDrawer = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      void fetchBoundsComparison(includeVat, sortBy);
    }
  };

  const handleToggleVat = () => {
    const nextVat = !includeVat;
    setIncludeVat(nextVat);
    void setVatIncluded(nextVat);
    if (open) {
      void fetchBoundsComparison(nextVat, sortBy);
    }
  };

  const handleSortChange = (nextSort: BoundsSortBy) => {
    setSortBy(nextSort);
    if (open) {
      void fetchBoundsComparison(includeVat, nextSort);
    }
  };

  return (
    <div className="mb-drawer-shell">
      {open && (
        <section className="mb-drawer-panel" aria-label="현재 지도 반경 최저가 비교 보드">
          <div className="mb-drawer-header">
            <div className="mb-drawer-title-row">
              <BrandInfinityIcon size={15} />
              <span className="mb-drawer-title">반경 내 비급여 최저가 정렬 보드</span>
            </div>
            <button
              type="button"
              className="mb-drawer-close"
              aria-label="비교 보드 닫기"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="mb-drawer-toolbar">
            <div className="mb-sort-tabs" role="tablist" aria-label="정렬 기준">
              <button
                type="button"
                role="tab"
                aria-selected={sortBy === 'lowest_price'}
                className={`mb-sort-tab ${sortBy === 'lowest_price' ? 'is-active' : ''}`}
                onClick={() => handleSortChange('lowest_price')}
              >
                최저가순
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sortBy === 'discount_rate'}
                className={`mb-sort-tab ${sortBy === 'discount_rate' ? 'is-active' : ''}`}
                onClick={() => handleSortChange('discount_rate')}
              >
                할인율순
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sortBy === 'rating'}
                className={`mb-sort-tab ${sortBy === 'rating' ? 'is-active' : ''}`}
                onClick={() => handleSortChange('rating')}
              >
                평점순
              </button>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={includeVat}
              className={`mb-vat-toggle ${includeVat ? 'is-on' : 'is-off'}`}
              onClick={handleToggleVat}
            >
              {includeVat ? 'VAT 포함' : '표기가'}
            </button>
          </div>

          <div className="mb-drawer-body">
            {loading ? (
              <p className="mb-drawer-status">현재 화면 병원의 정규화 가격을 비교하는 중...</p>
            ) : items.length === 0 ? (
              <div className="mb-drawer-empty">
                <EmptySearchGraphic />
                <p>현재 목록에서 심평원·이벤트 매칭 병원이 아직 없습니다.</p>
              </div>
            ) : (
              <ul className="mb-drawer-list">
                {items.map((clinic, index) => (
                  <li key={clinic.hospitalId} className="mb-drawer-item">
                    <div className="mb-drawer-item-top">
                      <div className="mb-drawer-clinic-meta">
                        <span className="mb-drawer-rank">{index + 1}</span>
                        <span className="mb-drawer-name">{clinic.name}</span>
                        {clinic.hiraVerified && <HiraVerifiedBadge compact />}
                      </div>
                      {index === 0 && <BestPriceBadge label="화면 최저" />}
                    </div>

                    {clinic.lowestOffer && (
                      <div className="mb-drawer-item-bottom">
                        <span className="mb-drawer-offer-desc">
                          [{clinic.lowestOffer.platformLabel}] {clinic.lowestOffer.treatmentName}
                        </span>
                        <a
                          href={clinic.lowestOffer.bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-drawer-price-link"
                        >
                          {formatKoreanWon(clinic.lowestOffer.effectivePrice)} ↗
                        </a>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        className="mb-drawer-trigger"
        onClick={handleOpenDrawer}
        aria-expanded={open}
      >
        <BrandInfinityIcon size={16} />
        <span>현재 화면 병원 최저가 보드 ({hospitals.length}곳)</span>
      </button>
    </div>
  );
}
