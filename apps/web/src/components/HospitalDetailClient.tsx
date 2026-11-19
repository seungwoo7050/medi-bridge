'use client';

import type { HospitalComparisonSummary } from '@medi-bridge/shared';
import {
  computeEffectivePrice,
  computeSavingsVsBaseline,
  formatKoreanWon,
} from '@medi-bridge/shared';
import { BestPriceBadge, HiraVerifiedBadge } from '@medi-bridge/ui';
import { ArrowLeft, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useMemo, useState } from 'react';

export function HospitalDetailClient({
  clinic,
}: {
  readonly clinic: HospitalComparisonSummary;
}): React.JSX.Element {
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [selectedCode, setSelectedCode] = useState<string>('ALL');

  const treatmentCodes = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of clinic.offers) {
      map.set(o.treatmentCode, o.treatmentName);
    }
    return Array.from(map.entries());
  }, [clinic]);

  const normalizedOffers = useMemo(() => {
    const baselineMap: Record<string, number> = {};
    for (const b of clinic.hiraBaselineItems) {
      baselineMap[b.treatmentCode] = b.minPrice;
    }

    return clinic.offers
      .filter((o) => selectedCode === 'ALL' || o.treatmentCode === selectedCode)
      .map((offer) => {
        const effectivePrice = computeEffectivePrice(
          offer.listedPrice,
          offer.vatIncluded,
          includeVat,
        );
        const baseline = baselineMap[offer.treatmentCode] ?? null;
        const { savingsAmount, savingsPercent } = computeSavingsVsBaseline(
          effectivePrice,
          baseline,
        );
        return {
          ...offer,
          effectivePrice,
          hiraBaselinePrice: baseline,
          savingsAmount,
          savingsPercent,
        };
      })
      .sort((a, b) => a.effectivePrice - b.effectivePrice);
  }, [clinic, includeVat, selectedCode]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#1E2456]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>전체 비교 목록으로 돌아가기</span>
      </Link>

      <section className="rounded-2xl bg-[#1E2456] text-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#252D6B] px-2.5 py-0.5 text-xs font-semibold text-[#86B898]">
                {clinic.department}
              </span>
              {clinic.hiraVerified && <HiraVerifiedBadge />}
              {clinic.maxSavingsPercent > 0 && (
                <BestPriceBadge label={`정가 대비 최대 ${clinic.maxSavingsPercent}% 절감`} />
              )}
            </div>
            <h1 className="text-2xl font-extrabold">{clinic.name}</h1>
            <p className="text-xs text-indigo-100/80">
              {clinic.roadAddress}
              {clinic.ykiho && <span className="ml-2 opacity-75">· 요양기호 대조 완료</span>}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={includeVat}
            onClick={() => setIncludeVat((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer ${
              includeVat ? 'bg-[#86B898] text-[#142038]' : 'bg-[#252D6B] text-white'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{includeVat ? 'VAT 포함 실질가 기준 ON' : '표기가 기준 (VAT 별도)'}</span>
          </button>
        </div>
      </section>

      {/* HIRA Baselines */}
      <section className="rounded-2xl bento-glass border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#1E2456]">
          건강보험심사평가원(심평원) 비급여 신고 정가
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {clinic.hiraBaselineItems.map((item) => (
            <div
              key={item.treatmentCode}
              className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-900">{item.treatmentName}</p>
                <p className="text-[11px] text-slate-500">신고일 {item.reportedDate}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-[#1E2456]">
                  {formatKoreanWon(item.minPrice)}
                  {item.maxPrice > item.minPrice ? ` ~ ${formatKoreanWon(item.maxPrice)}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Multi-Platform Price Comparison */}
      <section className="rounded-2xl bento-glass border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#1E2456]">플랫폼별 이벤트 가격 대조</h2>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCode('ALL')}
              className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer ${
                selectedCode === 'ALL' ? 'bg-[#1E2456] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              전체 시술
            </button>
            {treatmentCodes.map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedCode(code)}
                className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer ${
                  selectedCode === code ? 'bg-[#1E2456] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {normalizedOffers.map((offer, idx) => (
            <div
              key={offer.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                idx === 0 ? 'bg-[#EFF7F2] border-[#86B898]' : 'bg-white border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#1E2456] px-2 py-0.5 text-[11px] font-bold text-white">
                    {offer.platformLabel}
                  </span>
                  {offer.badge && (
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-[#1E2456]">
                      {offer.badge}
                    </span>
                  )}
                  {idx === 0 && <BestPriceBadge label="현재 조건 최저가" />}
                </div>
                <p className="text-sm font-semibold text-slate-900">{offer.rawTitle}</p>
                <p className="text-[11px] text-slate-500">
                  표기가 {formatKoreanWon(offer.listedPrice)} (
                  {offer.vatIncluded ? 'VAT 포함' : 'VAT 별도'})
                  {offer.savingsAmount > 0 &&
                    ` · 정가 대비 ${formatKoreanWon(offer.savingsAmount)} (${offer.savingsPercent}%) 절감`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg font-extrabold text-slate-900">
                  {formatKoreanWon(offer.effectivePrice)}
                </span>
                <a
                  href={offer.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl bg-[#1E2456] px-3 py-2 text-xs font-bold text-white hover:bg-[#252D6B]"
                >
                  <span>예약처 이동</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
