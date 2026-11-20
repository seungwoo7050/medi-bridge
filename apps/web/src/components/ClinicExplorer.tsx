'use client';

import type {
  BoundsSortBy,
  HospitalComparisonSummary,
  RawPlatformOffer,
} from '@medi-bridge/shared';
import {
  computeEffectivePrice,
  computeSavingsVsBaseline,
  formatPriceKRW,
  STANDARD_TREATMENTS,
} from '@medi-bridge/shared';
import { MapPin, Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useMemo, useState } from 'react';

interface ExplorerStatsItem {
  readonly code: string;
  readonly category: string;
  readonly label: string;
  readonly clinicCount: number;
  readonly avgHiraPrice: number;
  readonly lowestEffectivePrice: number;
}

export interface ClinicExplorerProps {
  readonly initialClinics: readonly HospitalComparisonSummary[];
  readonly stats: readonly ExplorerStatsItem[];
}

const CATEGORIES = ['전체', '안과', '치과', '피부과', '정형외과'] as const;
const REGIONS = ['전체', '강남구', '서초구'] as const;

const TREATMENT_META = new Map(STANDARD_TREATMENTS.map((item) => [item.code, item]));

function scopeClinicToTreatment(
  clinic: HospitalComparisonSummary,
  treatmentCode: string,
  includeVat: boolean,
): HospitalComparisonSummary {
  const baseline = clinic.hiraBaselineItems.find((b) => b.treatmentCode === treatmentCode) ?? null;
  const scopedOffers = clinic.offers
    .filter((offer) => offer.treatmentCode === treatmentCode && offer.platform !== 'hira')
    .map((offer) => {
      const effectivePrice = computeEffectivePrice(
        offer.listedPrice,
        offer.vatIncluded,
        includeVat,
      );
      const { savingsAmount, savingsPercent } = computeSavingsVsBaseline(
        effectivePrice,
        baseline?.minPrice ?? null,
      );
      return {
        ...offer,
        effectivePrice,
        hiraBaselinePrice: baseline?.minPrice ?? null,
        savingsAmount,
        savingsPercent,
        isLowest: false,
      };
    })
    .sort((a, b) => a.effectivePrice - b.effectivePrice)
    .map((offer, idx) => ({
      ...offer,
      isLowest: idx === 0 && offer.effectivePrice > 0,
    }));

  const lowestOffer = scopedOffers[0] ?? null;
  return {
    ...clinic,
    activeTreatmentCode: treatmentCode,
    hiraBaselineItems: baseline ? [baseline] : [],
    offers: scopedOffers,
    lowestOffer,
    maxSavingsAmount: lowestOffer?.savingsAmount ?? 0,
    maxSavingsPercent: lowestOffer?.savingsPercent ?? 0,
  };
}

function getClinicTreatmentCodes(clinic: HospitalComparisonSummary): readonly string[] {
  const seen = new Set<string>();
  for (const b of clinic.hiraBaselineItems) {
    seen.add(b.treatmentCode);
  }
  for (const o of clinic.offers) {
    seen.add(o.treatmentCode);
  }
  return Array.from(seen);
}

function matchesTextQuery(
  clinic: HospitalComparisonSummary,
  loweredQuery: string,
  matchingOffersOnly?: readonly RawPlatformOffer[],
): boolean {
  const hay = [
    clinic.name,
    clinic.department,
    clinic.roadAddress,
    clinic.subwayInfo ?? '',
    ...(matchingOffersOnly ?? clinic.offers).map((o) => `${o.treatmentName} ${o.rawTitle}`),
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(loweredQuery);
}

export function ClinicExplorer({ initialClinics }: ClinicExplorerProps): React.JSX.Element {
  const [query, setQuery] = useState<string>('');
  const [department, setDepartment] = useState<string>('전체');
  const [selectedTreatmentCode, setSelectedTreatmentCode] = useState<string>('OPHTH_SMILE');
  const [region, setRegion] = useState<string>('전체');
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<BoundsSortBy>('lowest_price');

  const availableTreatments = useMemo(() => {
    const codeSet = new Set<string>();
    for (const clinic of initialClinics) {
      if (department !== '전체' && clinic.department !== department) continue;
      for (const code of getClinicTreatmentCodes(clinic)) {
        codeSet.add(code);
      }
    }
    return STANDARD_TREATMENTS.filter((item) => codeSet.has(item.code));
  }, [initialClinics, department]);

  const effectiveSelectedCode = useMemo(() => {
    if (availableTreatments.some((t) => t.code === selectedTreatmentCode)) {
      return selectedTreatmentCode;
    }
    return availableTreatments[0]?.code ?? 'OPHTH_SMILE';
  }, [availableTreatments, selectedTreatmentCode]);

  const clinics = useMemo(() => {
    const q = query.trim().toLowerCase();

    const baseFiltered = initialClinics.filter((clinic) => {
      if (department !== '전체' && clinic.department !== department) return false;
      if (region !== '전체' && !`${clinic.sigungu} ${clinic.roadAddress}`.includes(region)) {
        return false;
      }
      return true;
    });

    const strictScoped = baseFiltered
      .filter((clinic) => getClinicTreatmentCodes(clinic).includes(effectiveSelectedCode))
      .map((clinic) => scopeClinicToTreatment(clinic, effectiveSelectedCode, includeVat))
      .filter((clinic) => {
        if (!q) return clinic.offers.length > 0;
        return matchesTextQuery(clinic, q);
      });

    let results = strictScoped;

    if (results.length === 0 && q) {
      const matchedTreatment = STANDARD_TREATMENTS.find((t) =>
        `${t.label} ${t.aliases.join(' ')}`.toLowerCase().includes(q),
      );
      results = baseFiltered
        .filter((clinic) => matchesTextQuery(clinic, q))
        .map((clinic) => {
          const fallbackCode =
            (matchedTreatment && getClinicTreatmentCodes(clinic).includes(matchedTreatment.code)
              ? matchedTreatment.code
              : clinic.hiraBaselineItems[0]?.treatmentCode) ??
            clinic.offers[0]?.treatmentCode ??
            effectiveSelectedCode;
          return scopeClinicToTreatment(clinic, fallbackCode, includeVat);
        })
        .filter((clinic) => clinic.offers.length > 0);
    }

    const sorted = [...results];
    sorted.sort((a, b) => {
      if (sortBy === 'discount_rate') {
        if (b.maxSavingsPercent !== a.maxSavingsPercent) {
          return b.maxSavingsPercent - a.maxSavingsPercent;
        }
      } else if (sortBy === 'rating') {
        const diff = (b.rating ?? 0) - (a.rating ?? 0);
        if (diff !== 0) return diff;
      }
      return (
        (a.lowestOffer?.effectivePrice ?? Number.MAX_SAFE_INTEGER) -
        (b.lowestOffer?.effectivePrice ?? Number.MAX_SAFE_INTEGER)
      );
    });

    return sorted;
  }, [initialClinics, department, region, effectiveSelectedCode, includeVat, query, sortBy]);

  const activeTreatmentMeta = TREATMENT_META.get(effectiveSelectedCode);

  const handleSelectDepartment = (cat: string) => {
    setDepartment(cat);
    if (cat === '전체') return;
    const firstCode = STANDARD_TREATMENTS.find((t) =>
      initialClinics.some(
        (clinic) => clinic.department === cat && getClinicTreatmentCodes(clinic).includes(t.code),
      ),
    )?.code;
    if (firstCode) {
      setSelectedTreatmentCode(firstCode);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-5">
      {/* Compact Utility Search & VAT Switch */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              시술별 병원 실결제가 비교
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              병원 앱마다 숨겨둔 부가세(10%)를 모두 더해 같은 시술끼리 실제 결제할 금액만
              비교합니다.
            </p>
          </div>
          <Link
            href="/intro"
            className="text-xs font-semibold text-[#1E2456] hover:underline self-start sm:self-auto shrink-0"
          >
            부가세 10% 계산 체험 →
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="시술명, 병원명, 지하철역 검색 (예: 스마일라식, 하루플란트, 강남역)"
              aria-label="시술명 또는 병원명 검색"
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E2456] focus:outline-none focus:ring-2 focus:ring-[#1E2456]/15"
            />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={includeVat}
            onClick={() => setIncludeVat((prev) => !prev)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold border transition cursor-pointer shrink-0 ${
              includeVat
                ? 'bg-[#1E2456] text-white border-[#1E2456]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{includeVat ? '부가세 10% 포함 실결제가' : '앱 광고 표기가 (부가세 별도)'}</span>
          </button>
        </div>
      </section>

      {/* Procedure-First Two-Row Filter */}
      <section className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <fieldset
            className="flex flex-wrap items-center gap-1.5 border-0 p-0 m-0"
            aria-label="진료과 선택"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelectDepartment(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  department === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </fieldset>

          <div className="flex items-center gap-2">
            <select
              aria-label="지역 선택"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r === '전체' ? '지역 전체' : r}
                </option>
              ))}
            </select>

            <select
              aria-label="정렬 기준"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as BoundsSortBy)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="lowest_price">실결제가 낮은순</option>
              <option value="discount_rate">정가 대비 할인율순</option>
              <option value="rating">평점순</option>
            </select>
          </div>
        </div>

        <fieldset
          className="flex flex-wrap items-center gap-1.5 border-0 p-0 m-0"
          aria-label="세부 시술 선택"
        >
          {availableTreatments.map((item) => {
            const isSelected = item.code === effectiveSelectedCode;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setSelectedTreatmentCode(item.code)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer border ${
                  isSelected
                    ? 'bg-[#EFF7F2] text-[#1B5E43] border-[#86B898] font-semibold'
                    : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </fieldset>
      </section>

      {/* Result Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          <strong className="font-semibold text-slate-800">
            {query.trim() ? `"${query.trim()}" 검색 결과` : (activeTreatmentMeta?.label ?? '전체')}
          </strong>{' '}
          비교 병원 {clinics.length}곳
        </span>
        <span className="hidden sm:inline">
          {includeVat ? '부가세 10% 포함 기준 정렬' : '앱 표기가 원액 기준 정렬'}
        </span>
      </div>

      {/* Procedure-Scoped Clean Comparison List */}
      <section className="space-y-3" aria-label="병원 시술 가격 비교 목록">
        {clinics.length === 0 ? (
          <div className="rounded-xl bg-white border border-dashed border-slate-300 p-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-600">조건에 맞는 병원이 없습니다.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDepartment('전체');
                setRegion('전체');
                setSelectedTreatmentCode('OPHTH_SMILE');
              }}
              className="text-xs font-semibold text-[#1E2456] hover:underline cursor-pointer"
            >
              전체 검색 조건 초기화
            </button>
          </div>
        ) : (
          clinics.map((clinic) => {
            const baseline = clinic.hiraBaselineItems[0];
            const treatmentMeta = TREATMENT_META.get(
              clinic.activeTreatmentCode ?? effectiveSelectedCode,
            );
            const unitLabel = baseline?.unitLabel ?? treatmentMeta?.unitLabel ?? '';
            const naverMapUrl = `https://map.naver.com/p/search/${encodeURIComponent(clinic.name)}`;

            return (
              <article
                key={clinic.hospitalId}
                className="rounded-xl border border-slate-200 bg-white px-5 py-4 transition hover:border-slate-300"
              >
                {/* Clinic Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        {clinic.name}
                      </h2>
                      <span className="text-xs font-medium text-slate-500">
                        {clinic.department}
                      </span>
                      {clinic.rating !== null && (
                        <span className="text-xs font-semibold text-amber-600 tabular-nums">
                          ★ {clinic.rating.toFixed(1)} ({clinic.reviewCount.toLocaleString('ko-KR')}
                          )
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{clinic.roadAddress}</span>
                      </span>
                      {clinic.subwayInfo && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="font-medium text-slate-700">{clinic.subwayInfo}</span>
                        </>
                      )}
                      <span className="text-slate-300">·</span>
                      <a
                        href={naverMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[#1E2456] hover:underline"
                      >
                        네이버 지도 ↗
                      </a>
                    </div>
                  </div>

                  <Link
                    href={`/hospitals/${clinic.slug}`}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shrink-0"
                  >
                    가격 상세
                  </Link>
                </div>

                {/* Official HIRA Baseline Line (Clean divider, zero box-in-box) */}
                {baseline && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>
                      병원 신고 정가 · {baseline.treatmentName}
                      {unitLabel ? ` (${unitLabel})` : ''}
                    </span>
                    <span className="font-semibold tabular-nums tracking-tight line-through text-slate-400 whitespace-nowrap shrink-0">
                      {formatPriceKRW(baseline.minPrice)}
                    </span>
                  </div>
                )}

                {/* Scoped Platform Offers (divide-y only, no nested boxes) */}
                <div className="mt-1 divide-y divide-slate-100">
                  {clinic.offers.map((offer, idx) => (
                    <div
                      key={offer.id}
                      className="py-2.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 text-xs sm:text-sm"
                    >
                      <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 min-w-0">
                        <span className="w-14 sm:w-16 shrink-0 text-xs font-semibold text-slate-700">
                          {offer.platformLabel}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 sm:truncate">{offer.rawTitle}</p>
                          {!offer.vatIncluded && (
                            <p className="text-[11px] text-slate-500 tabular-nums">
                              {includeVat
                                ? `이벤트가 ${formatPriceKRW(offer.listedPrice)} + 부가세 10%`
                                : '부가세 10% 별도 표기'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 whitespace-nowrap">
                        {idx === 0 && offer.savingsPercent > 0 && (
                          <span className="text-xs font-bold text-[#1B5E43] tabular-nums">
                            -{offer.savingsPercent}%
                          </span>
                        )}
                        <span
                          className={`text-right font-bold tabular-nums tracking-tight whitespace-nowrap text-sm sm:text-base ${
                            idx === 0 ? 'text-[#1B5E43]' : 'text-slate-900'
                          }`}
                        >
                          {formatPriceKRW(offer.effectivePrice)}
                        </span>
                        <a
                          href={offer.bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline whitespace-nowrap"
                        >
                          원문 보기 ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
