'use client';

import { computeEffectivePrice, formatKoreanWon } from '@medi-bridge/shared';
import { SlidersHorizontal } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface SimulatorScenario {
  readonly id: string;
  readonly label: string;
  readonly hiraPrice: number;
  readonly offers: readonly {
    readonly platform: string;
    readonly listedPrice: number;
    readonly vatIncluded: boolean;
  }[];
}

const SCENARIOS: readonly SimulatorScenario[] = [
  {
    id: 'smile',
    label: '스마일라식 (강남권 안과)',
    hiraPrice: 3_500_000,
    offers: [
      { platform: '모두닥', listedPrice: 2_090_000, vatIncluded: true },
      { platform: '강남언니 (첫방문)', listedPrice: 1_950_000, vatIncluded: false },
      { platform: '굿닥', listedPrice: 2_200_000, vatIncluded: true },
    ],
  },
  {
    id: 'inmode',
    label: '인모드 FX 풀페이스 (서초권 피부과)',
    hiraPrice: 450_000,
    offers: [
      { platform: '여신티켓', listedPrice: 160_000, vatIncluded: false },
      { platform: '강남언니', listedPrice: 180_000, vatIncluded: true },
      { platform: '바비톡', listedPrice: 190_000, vatIncluded: false },
    ],
  },
  {
    id: 'implant',
    label: '국산 임플란트 (강남권 치과)',
    hiraPrice: 1_350_000,
    offers: [
      { platform: '모두닥', listedPrice: 690_000, vatIncluded: true },
      { platform: '굿닥', listedPrice: 650_000, vatIncluded: false },
    ],
  },
];

export function SavingsSimulator(): React.JSX.Element {
  const [scenarioId, setScenarioId] = useState<string>('smile');
  const [includeVat, setIncludeVat] = useState<boolean>(true);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  if (!scenario) {
    return <div />;
  }

  const ranked = scenario.offers
    .map((offer) => ({
      ...offer,
      effective: computeEffectivePrice(offer.listedPrice, offer.vatIncluded, includeVat),
    }))
    .sort((a, b) => a.effective - b.effective);

  const lowest = ranked[0];
  const savings = lowest ? Math.max(0, scenario.hiraPrice - lowest.effective) : 0;

  return (
    <div className="rounded-2xl bento-glass border border-slate-200 p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#1E2456]">
            내 동네 시술가 거품 빼기 시뮬레이터
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            VAT 별도 광고 가격과 VAT 포함 실제 결제 금액의 순위 변화를 직접 확인해 보세요.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={includeVat}
          onClick={() => setIncludeVat((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold border transition cursor-pointer ${
            includeVat
              ? 'bg-[#1E2456] text-white border-[#1E2456]'
              : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>{includeVat ? 'VAT 포함 실질가 기준' : '플랫폼 광고 표기가 기준'}</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setScenarioId(item.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              scenarioId === item.id
                ? 'bg-[#2F6F55] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#EEF0FA] border border-[#C7CEEB] p-4 space-y-1">
          <span className="text-[11px] font-bold text-[#1E2456]">심평원 신고 정가</span>
          <p className="text-xl font-extrabold text-slate-900">
            {formatKoreanWon(scenario.hiraPrice)}
          </p>
          <p className="text-[11px] text-slate-500">공공데이터 기준 비교선</p>
        </div>

        <div className="rounded-xl bg-[#EFF7F2] border border-[#C5E1CF] p-4 space-y-1">
          <span className="text-[11px] font-bold text-[#2F6F55]">현재 기준 최저 플랫폼</span>
          <p className="text-xl font-extrabold text-[#2F6F55]">
            {lowest ? `${lowest.platform} ${formatKoreanWon(lowest.effective)}` : '-'}
          </p>
          <p className="text-[11px] text-slate-600">
            {includeVat ? '숨은 부가세 10% 자동 반영됨' : 'VAT 별도 표기가 기준 정렬'}
          </p>
        </div>

        <div className="rounded-xl bg-[#1E2456] text-white p-4 space-y-1">
          <span className="text-[11px] font-bold text-[#86B898]">예상 절감 금액</span>
          <p className="text-xl font-extrabold">{formatKoreanWon(savings)}</p>
          <p className="text-[11px] text-indigo-200">동일 병원 심평원 신고 정가 대비</p>
        </div>
      </div>

      <div className="space-y-2">
        {ranked.map((item, idx) => (
          <div
            key={item.platform}
            className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs ${
              idx === 0 ? 'bg-[#EFF7F2] border-[#86B898]' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1E2456]">
                {idx + 1}위 · {item.platform}
              </span>
              <span className="text-slate-500">
                (표기 {formatKoreanWon(item.listedPrice)} ·{' '}
                {item.vatIncluded ? 'VAT 포함' : 'VAT 별도'})
              </span>
            </div>
            <span className="font-extrabold text-slate-900">{formatKoreanWon(item.effective)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
