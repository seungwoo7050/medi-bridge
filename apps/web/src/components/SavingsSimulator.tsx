'use client';

import { computeEffectivePrice, formatPriceKRW } from '@medi-bridge/shared';
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
    label: '인모드 FX (강남권 피부과)',
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
    <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            부가세 10% 포함 실결제가 시뮬레이터
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            부가세 10% 포함 여부에 따라 실제 최저가 순위가 어떻게 바뀌는지 직접 확인해 보세요.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={includeVat}
          onClick={() => setIncludeVat((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition cursor-pointer ${
            includeVat
              ? 'bg-[#1E2456] text-white border-[#1E2456]'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>{includeVat ? '부가세 10% 포함 실결제가' : '앱 광고 표기가 (부가세 별도)'}</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setScenarioId(item.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
              scenarioId === item.id
                ? 'bg-[#EFF7F2] text-[#1B5E43] border-[#86B898] font-semibold'
                : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-y border-slate-100 py-4">
        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-500">병원 신고 정가</span>
          <p className="text-xl font-bold tabular-nums tracking-tight text-slate-900">
            {formatPriceKRW(scenario.hiraPrice)}
          </p>
          <p className="text-[11px] text-slate-400">건강보험심사평가원 공개 기준</p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-[#1B5E43]">현재 조건 최저가</span>
          <p className="text-xl font-bold tabular-nums tracking-tight text-[#1B5E43]">
            {lowest ? `${lowest.platform} ${formatPriceKRW(lowest.effective)}` : '-'}
          </p>
          <p className="text-[11px] text-slate-500">
            {includeVat ? '숨은 부가세 10% 자동 합산' : '부가세 별도 광고 표기 기준'}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-500">신고 정가 대비 절감</span>
          <p className="text-xl font-bold tabular-nums tracking-tight text-[#1E2456]">
            {formatPriceKRW(savings)}
          </p>
          <p className="text-[11px] text-slate-400">동일 병원·동일 시술 기준</p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {ranked.map((item, idx) => (
          <div key={item.platform} className="py-2.5 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-900">
                {idx + 1}위 · {item.platform}
              </span>
              {!item.vatIncluded && (
                <p className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                  {includeVat
                    ? `이벤트가 ${formatPriceKRW(item.listedPrice)} + 부가세 10%`
                    : '부가세 10% 별도 표기'}
                </p>
              )}
            </div>
            <span
              className={`text-right text-sm font-bold tabular-nums tracking-tight ${
                idx === 0 ? 'text-[#1B5E43]' : 'text-slate-900'
              }`}
            >
              {formatPriceKRW(item.effective)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
