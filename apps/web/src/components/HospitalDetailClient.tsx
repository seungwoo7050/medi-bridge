'use client';

import type { HospitalComparisonSummary } from '@medi-bridge/shared';
import {
  computeEffectivePrice,
  computeSavingsVsBaseline,
  formatPriceKRW,
  STANDARD_TREATMENTS,
} from '@medi-bridge/shared';
import { ArrowLeft, MapPin, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useMemo, useState } from 'react';

const TREATMENT_META = new Map(STANDARD_TREATMENTS.map((item) => [item.code, item]));

export function HospitalDetailClient({
  clinic,
}: {
  readonly clinic: HospitalComparisonSummary;
}): React.JSX.Element {
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [selectedCode, setSelectedCode] = useState<string>(
    clinic.hiraBaselineItems[0]?.treatmentCode ?? clinic.offers[0]?.treatmentCode ?? '',
  );

  const treatmentCodes = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of clinic.offers) {
      map.set(o.treatmentCode, o.treatmentName);
    }
    return Array.from(map.entries());
  }, [clinic]);

  const effectiveCode = selectedCode || treatmentCodes[0]?.[0] || '';
  const activeBaseline = useMemo(
    () => clinic.hiraBaselineItems.find((b) => b.treatmentCode === effectiveCode) ?? null,
    [clinic.hiraBaselineItems, effectiveCode],
  );

  const normalizedOffers = useMemo(() => {
    return clinic.offers
      .filter((o) => !effectiveCode || o.treatmentCode === effectiveCode)
      .map((offer) => {
        const effectivePrice = computeEffectivePrice(
          offer.listedPrice,
          offer.vatIncluded,
          includeVat,
        );
        const baselinePrice = activeBaseline?.minPrice ?? null;
        const { savingsAmount, savingsPercent } = computeSavingsVsBaseline(
          effectivePrice,
          baselinePrice,
        );
        return {
          ...offer,
          effectivePrice,
          hiraBaselinePrice: baselinePrice,
          savingsAmount,
          savingsPercent,
        };
      })
      .sort((a, b) => a.effectivePrice - b.effectivePrice);
  }, [clinic.offers, effectiveCode, includeVat, activeBaseline]);

  const naverMapUrl = `https://map.naver.com/p/search/${encodeURIComponent(clinic.name)}`;
  const activeUnitLabel =
    activeBaseline?.unitLabel ?? TREATMENT_META.get(effectiveCode)?.unitLabel ?? '';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#1E2456]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>전체 시술 비교 목록으로</span>
      </Link>

      {/* Clinic Header Card (Single accent control, zero eyebrow pills) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {clinic.name}
              </h1>
              <span className="text-xs font-medium text-slate-500">{clinic.department}</span>
              {clinic.rating !== null && (
                <span className="text-xs font-semibold text-amber-600 tabular-nums">
                  ★ {clinic.rating.toFixed(1)} ({clinic.reviewCount.toLocaleString('ko-KR')})
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

          <button
            type="button"
            role="switch"
            aria-checked={includeVat}
            onClick={() => setIncludeVat((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition cursor-pointer shrink-0 ${
              includeVat
                ? 'bg-[#1E2456] text-white border-[#1E2456]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{includeVat ? '부가세 10% 포함 실결제가' : '앱 광고 표기가 (부가세 별도)'}</span>
          </button>
        </div>

        {/* Procedure Selector Tabs */}
        {treatmentCodes.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            {treatmentCodes.map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedCode(code)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer border transition ${
                  effectiveCode === code
                    ? 'bg-[#EFF7F2] text-[#1B5E43] border-[#86B898] font-semibold'
                    : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Procedure-Specific HIRA Baseline + Platform Comparison Table */}
      <section className="rounded-xl border border-slate-200 bg-white px-6 py-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            플랫폼별 비교 · {activeBaseline?.treatmentName ?? ''}
            {activeUnitLabel ? ` (${activeUnitLabel})` : ''}
          </h2>
          {activeBaseline && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>병원 신고 정가</span>
              <span className="font-semibold tabular-nums tracking-tight line-through text-slate-400">
                {formatPriceKRW(activeBaseline.minPrice)}
              </span>
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {normalizedOffers.map((offer, idx) => (
            <div
              key={offer.id}
              className="py-3.5 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1E2456]">{offer.platformLabel}</span>
                  {idx === 0 && (
                    <span className="rounded-md bg-[#EFF7F2] px-2 py-0.5 text-[11px] font-semibold text-[#1B5E43]">
                      최저 실결제가
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-900">{offer.rawTitle}</p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {offer.vatIncluded
                    ? `부가세 포함 ${formatPriceKRW(offer.listedPrice)}`
                    : includeVat
                      ? `이벤트가 ${formatPriceKRW(offer.listedPrice)} + 부가세 10%`
                      : `이벤트가 ${formatPriceKRW(offer.listedPrice)} (부가세 별도)`}
                  {offer.savingsAmount > 0 &&
                    ` · 신고 정가 대비 ${formatPriceKRW(offer.savingsAmount)} 할인`}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {idx === 0 && offer.savingsPercent > 0 && (
                  <span className="text-xs font-bold text-[#1B5E43] tabular-nums">
                    -{offer.savingsPercent}%
                  </span>
                )}
                <span
                  className={`text-right text-base sm:text-lg font-bold tabular-nums tracking-tight ${
                    idx === 0 ? 'text-[#1B5E43]' : 'text-slate-900'
                  }`}
                >
                  {formatPriceKRW(offer.effectivePrice)}
                </span>
                <a
                  href={offer.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline whitespace-nowrap"
                >
                  원문 보기 ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
