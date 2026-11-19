'use client';

import type { BoundsSortBy, HospitalComparisonSummary } from '@medi-bridge/shared';
import {
  computeEffectivePrice,
  computeSavingsVsBaseline,
  formatKoreanWon,
} from '@medi-bridge/shared';
import { BestPriceBadge, CategoryPinIcon, HiraVerifiedBadge } from '@medi-bridge/ui';
import { ArrowUpRight, MapPin, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
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
  readonly hasDynamicMapKey: boolean;
}

const CATEGORIES = ['전체', '안과', '피부과', '치과', '정형외과', '성형외과'] as const;
const REGIONS = ['전체', '강남구', '서초구', '분당구', '종로구'] as const;

function rerankClinicForVat(
  clinic: HospitalComparisonSummary,
  includeVat: boolean,
): HospitalComparisonSummary {
  const baselineMap: Record<string, number> = {};
  for (const b of clinic.hiraBaselineItems) {
    baselineMap[b.treatmentCode] = b.minPrice;
  }

  const offers = clinic.offers
    .map((offer) => {
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
        isLowest: false,
      };
    })
    .sort((a, b) => a.effectivePrice - b.effectivePrice);

  const minByTreatment = new Map<string, number>();
  for (const offer of offers) {
    if (offer.platform === 'hira' || offer.effectivePrice <= 0) continue;
    const prev = minByTreatment.get(offer.treatmentCode);
    if (prev === undefined || offer.effectivePrice < prev) {
      minByTreatment.set(offer.treatmentCode, offer.effectivePrice);
    }
  }

  const flagged = offers.map((offer) => ({
    ...offer,
    isLowest:
      offer.platform !== 'hira' && minByTreatment.get(offer.treatmentCode) === offer.effectivePrice,
  }));

  const lowestOffer = flagged.find((o) => o.platform !== 'hira' && o.effectivePrice > 0) ?? null;
  let maxSavingsAmount = 0;
  let maxSavingsPercent = 0;
  for (const offer of flagged) {
    if (offer.savingsAmount > maxSavingsAmount) maxSavingsAmount = offer.savingsAmount;
    if (offer.savingsPercent > maxSavingsPercent) maxSavingsPercent = offer.savingsPercent;
  }

  return {
    ...clinic,
    offers: flagged,
    lowestOffer,
    maxSavingsAmount,
    maxSavingsPercent,
  };
}

export function ClinicExplorer({
  initialClinics,
  stats,
  hasDynamicMapKey,
}: ClinicExplorerProps): React.JSX.Element {
  const [query, setQuery] = useState<string>('');
  const [department, setDepartment] = useState<string>('전체');
  const [region, setRegion] = useState<string>('전체');
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<BoundsSortBy>('lowest_price');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialClinics[0]?.hospitalId ?? null,
  );

  const clinics = useMemo(() => {
    const q = query.trim().toLowerCase();
    const mapped = initialClinics
      .map((clinic) => rerankClinicForVat(clinic, includeVat))
      .filter((clinic) => {
        if (department !== '전체' && clinic.department !== department) return false;
        if (region !== '전체' && !`${clinic.sigungu} ${clinic.roadAddress}`.includes(region)) {
          return false;
        }
        if (q) {
          const hay = `${clinic.name} ${clinic.department} ${clinic.roadAddress} ${clinic.offers
            .map((o) => `${o.treatmentName} ${o.rawTitle}`)
            .join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

    mapped.sort((a, b) => {
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

    return mapped;
  }, [initialClinics, includeVat, department, region, query, sortBy]);

  const pinBounds = useMemo(() => {
    if (clinics.length === 0) {
      return { minLat: 37.35, maxLat: 37.58, minLng: 126.97, maxLng: 127.12 };
    }
    let minLat = Number.MAX_VALUE;
    let maxLat = -Number.MAX_VALUE;
    let minLng = Number.MAX_VALUE;
    let maxLng = -Number.MAX_VALUE;
    for (const c of clinics) {
      if (c.lat < minLat) minLat = c.lat;
      if (c.lat > maxLat) maxLat = c.lat;
      if (c.lng < minLng) minLng = c.lng;
      if (c.lng > maxLng) maxLng = c.lng;
    }
    return {
      minLat: minLat - 0.015,
      maxLat: maxLat + 0.015,
      minLng: minLng - 0.015,
      maxLng: maxLng + 0.015,
    };
  }, [clinics]);

  const activeClinic = clinics.find((c) => c.hospitalId === selectedId) ?? clinics[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Top Bento Hero + Search Controls */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-2xl bg-[#1E2456] text-white p-6 shadow-md flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#252D6B] border border-indigo-400/30 px-3 py-1 text-xs font-semibold text-[#86B898]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>심평원 비급여 정가 vs 5개 플랫폼 이벤트 최저가</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
              VAT 별도 낚시 없이, 진짜 결제 금액으로 병원 비교
            </h1>
            <p className="text-sm text-indigo-100/85 max-w-2xl">
              모두닥, 강남언니, 여신티켓, 바비톡, 굿닥의 이벤트 공지를 심평원 신고 정가와 같은
              기준선으로 정규화했습니다. 네이버 지도 위에서 바로 비교하려면 Chrome 확장을 함께
              사용하세요.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="병원명, 지역 또는 시술명 검색 (예: 스마일라식, 인모드, 임플란트)"
                aria-label="병원 또는 시술 검색"
                className="w-full rounded-xl bg-white px-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#86B898]"
              />
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={includeVat}
              onClick={() => setIncludeVat((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border transition cursor-pointer shrink-0 ${
                includeVat
                  ? 'bg-[#86B898] text-[#142038] border-[#86B898]'
                  : 'bg-[#252D6B] text-indigo-100 border-indigo-400/40'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>
                {includeVat ? 'VAT 포함 실질가 기준 ON' : '플랫폼 표기가 기준 (VAT 별도)'}
              </span>
            </button>
          </div>
        </div>

        {/* Representative Treatment Highlights Bento */}
        <div className="lg:col-span-4 rounded-2xl bento-glass border border-slate-200/80 p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1E2456]">주요 시술 평균 정가 대비 최저</h2>
            <Link href="/intro" className="text-xs font-semibold text-[#2F6F55] hover:underline">
              거품 시뮬레이터 →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {stats.slice(0, 4).map((item) => {
              const rate =
                item.avgHiraPrice > 0 && item.lowestEffectivePrice > 0
                  ? Math.round(
                      ((item.avgHiraPrice - item.lowestEffectivePrice) / item.avgHiraPrice) * 100,
                    )
                  : 0;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setQuery(item.label.split(' ')[0] ?? '')}
                  className="flex items-center justify-between rounded-xl bg-slate-50 hover:bg-[#EEF0FA] border border-slate-200/70 px-3 py-2 text-left transition cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900">{item.label}</span>
                    <span className="ml-2 text-[11px] text-slate-500">
                      정가 {formatKoreanWon(item.avgHiraPrice)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-[#2F6F55]">
                      {formatKoreanWon(item.lowestEffectivePrice)}
                    </span>
                    {rate > 0 && (
                      <span className="ml-1.5 rounded-full bg-[#EFF7F2] px-1.5 py-0.5 text-[10px] font-bold text-[#2F6F55]">
                        -{rate}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-slate-200/80 px-4 py-3 shadow-xs">
        <fieldset
          className="flex flex-wrap items-center gap-1.5 border-0 p-0 m-0"
          aria-label="진료과 필터"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setDepartment(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                department === cat
                  ? 'bg-[#1E2456] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </fieldset>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="지역 선택"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700"
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
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="lowest_price">최저가순</option>
            <option value="discount_rate">정가 대비 할인율순</option>
            <option value="rating">평점순</option>
          </select>
        </div>
      </section>

      {/* Map + Comparison Cards Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Coordinate Pin Viewport */}
        <div className="lg:col-span-5 rounded-2xl bento-glass border border-slate-200/80 p-4 flex flex-col gap-3 h-fit lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E2456]">
              <MapPin className="h-4 w-4 text-[#2F6F55]" />
              <span>비교 병원 좌표 핀 ({clinics.length}곳)</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {hasDynamicMapKey ? '지도 SDK 연동 활성' : '내장 좌표 핀 뷰어'}
            </span>
          </div>

          <div className="relative h-72 w-full overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-[#F0F3FA] via-[#F7FAF8] to-[#EEF0FA]">
            {/* Subtle coordinate grid */}
            <div
              className="absolute inset-0 opacity-35"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #CBD5E1 1px, transparent 1px), linear-gradient(to bottom, #CBD5E1 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />

            {clinics.map((clinic) => {
              const lngSpan = Math.max(0.01, pinBounds.maxLng - pinBounds.minLng);
              const latSpan = Math.max(0.01, pinBounds.maxLat - pinBounds.minLat);
              const leftPct = 10 + ((clinic.lng - pinBounds.minLng) / lngSpan) * 80;
              const topPct = 88 - ((clinic.lat - pinBounds.minLat) / latSpan) * 76;
              const isSelected = activeClinic?.hospitalId === clinic.hospitalId;

              return (
                <button
                  key={clinic.hospitalId}
                  type="button"
                  onClick={() => setSelectedId(clinic.hospitalId)}
                  style={{
                    left: `${Math.min(88, Math.max(10, leftPct))}%`,
                    top: `${Math.min(86, Math.max(12, topPct))}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition cursor-pointer ${
                    isSelected ? 'z-20 scale-110' : 'z-10 hover:z-20 hover:scale-105'
                  }`}
                >
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm whitespace-nowrap border ${
                      isSelected
                        ? 'bg-[#1E2456] text-white border-[#86B898]'
                        : 'bg-white text-slate-800 border-slate-200'
                    }`}
                  >
                    {clinic.lowestOffer
                      ? formatKoreanWon(clinic.lowestOffer.effectivePrice)
                      : clinic.name}
                  </span>
                  <CategoryPinIcon category={clinic.department} size={22} />
                </button>
              );
            })}
          </div>

          {activeClinic && (
            <div className="rounded-xl bg-[#1E2456] text-white p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-[#86B898]">
                    {activeClinic.department} · {activeClinic.sigungu}
                  </span>
                  <h3 className="text-sm font-bold">{activeClinic.name}</h3>
                  <p className="text-[11px] text-indigo-200">{activeClinic.roadAddress}</p>
                </div>
                <Link
                  href={`/hospitals/${activeClinic.slug}`}
                  className="shrink-0 rounded-lg bg-[#86B898] px-2.5 py-1 text-[11px] font-bold text-[#142038]"
                >
                  상세 대조
                </Link>
              </div>
              {activeClinic.lowestOffer && (
                <div className="flex items-center justify-between border-t border-indigo-400/25 pt-2 text-xs">
                  <span className="text-indigo-100">
                    최저 [{activeClinic.lowestOffer.platformLabel}]
                  </span>
                  <span className="font-extrabold text-[#86B898]">
                    {formatKoreanWon(activeClinic.lowestOffer.effectivePrice)}
                    {includeVat ? ' (VAT 포함)' : ' (표기가)'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clinic Bento Cards List */}
        <div className="lg:col-span-7 space-y-4">
          {clinics.length === 0 ? (
            <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              조건에 맞는 병원이 없습니다. 검색어나 진료과 필터를 초기화해 보세요.
            </div>
          ) : (
            clinics.map((clinic) => {
              const baseline = clinic.hiraBaselineItems[0];
              const topOffers = clinic.offers.slice(0, 3);
              const isSelected = activeClinic?.hospitalId === clinic.hospitalId;

              return (
                <article
                  key={clinic.hospitalId}
                  onMouseEnter={() => setSelectedId(clinic.hospitalId)}
                  className={`rounded-2xl bento-glass border p-5 transition ${
                    isSelected
                      ? 'border-[#1E2456] ring-2 ring-[#1E2456]/10'
                      : 'border-slate-200/80 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[#EEF0FA] px-2 py-0.5 text-[11px] font-bold text-[#1E2456]">
                          {clinic.department}
                        </span>
                        {clinic.hiraVerified && <HiraVerifiedBadge compact />}
                        {clinic.maxSavingsPercent >= 25 && (
                          <BestPriceBadge label={`정가 대비 최대 ${clinic.maxSavingsPercent}%↓`} />
                        )}
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900">{clinic.name}</h3>
                      <p className="text-xs text-slate-500">
                        {clinic.roadAddress}
                        {clinic.rating !== null && (
                          <span className="ml-2 font-semibold text-amber-600">
                            ★ {clinic.rating.toFixed(1)} (
                            {clinic.reviewCount.toLocaleString('ko-KR')})
                          </span>
                        )}
                      </p>
                    </div>

                    <Link
                      href={`/hospitals/${clinic.slug}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#1E2456] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#252D6B] transition"
                    >
                      <span>전 플랫폼 대조</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {baseline && (
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/70 px-3.5 py-2 text-xs">
                      <span className="font-medium text-slate-600">
                        심평원 신고 정가 ({baseline.treatmentName})
                      </span>
                      <span className="font-bold text-slate-500 line-through">
                        {formatKoreanWon(baseline.minPrice)}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    {topOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                          offer.isLowest
                            ? 'bg-[#EFF7F2] border-[#C5E1CF]'
                            : 'bg-white border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="rounded-md bg-slate-900/5 px-2 py-0.5 text-[11px] font-bold text-[#1E2456]">
                            {offer.platformLabel}
                          </span>
                          <span className="truncate font-medium text-slate-800">
                            {offer.rawTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!offer.vatIncluded && (
                            <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              {includeVat ? 'VAT +10% 반영' : 'VAT 별도'}
                            </span>
                          )}
                          <span className="text-sm font-extrabold text-slate-900">
                            {formatKoreanWon(offer.effectivePrice)}
                          </span>
                          <a
                            href={offer.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-[#1E2456] hover:underline"
                          >
                            확인 ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
