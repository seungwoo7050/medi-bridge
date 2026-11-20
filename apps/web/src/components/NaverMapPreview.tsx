'use client';

import { BrandInfinityIcon } from '@medi-bridge/ui';
import { Search } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

type SpecialtyKey = '치과' | '피부과' | '안과';

interface PreviewListItem {
  readonly name: string;
  readonly meta: string;
  readonly visited: boolean;
  readonly lowestPrice?: string;
}

interface PreviewPriceRow {
  readonly name: string;
  readonly discount: string | null;
  readonly original: string | null;
  readonly price: string;
}

interface PreviewScenario {
  readonly searchQuery: string;
  readonly selectedHospital: string;
  readonly selectedNeighborhood: string;
  readonly rating: string;
  readonly reviewCount: string;
  readonly listItems: readonly PreviewListItem[];
  readonly prices: readonly PreviewPriceRow[];
  readonly platforms: readonly string[];
}

const SPECIALTY_KEYS: readonly SpecialtyKey[] = ['치과', '피부과', '안과'];

const PREVIEW_SCENARIOS: Readonly<Record<SpecialtyKey, PreviewScenario>> = {
  치과: {
    searchQuery: '분당 정자동 치과',
    selectedHospital: '분당 바른미소치과의원',
    selectedNeighborhood: '경기 성남시 분당구 정자동',
    rating: '9.4',
    reviewCount: '386',
    listItems: [
      {
        name: '분당 바른미소치과의원',
        meta: '치과 · 정자동',
        visited: true,
        lowestPrice: '990,000원',
      },
      {
        name: '정자 서울고른치과의원',
        meta: '치과 · 정자동',
        visited: false,
      },
    ],
    prices: [
      {
        name: '오스템 임플란트',
        discount: '-32%',
        original: '1,450,000원',
        price: '990,000원',
      },
      {
        name: '지르코니아 크라운',
        discount: null,
        original: null,
        price: '500,000원',
      },
      {
        name: '세라믹 인레이',
        discount: null,
        original: null,
        price: '320,000원',
      },
    ],
    platforms: ['강남언니', '굿닥'],
  },
  피부과: {
    searchQuery: '서초역 피부과',
    selectedHospital: '서초 고운빛피부과의원',
    selectedNeighborhood: '서울 서초구 서초동',
    rating: '9.1',
    reviewCount: '512',
    listItems: [
      {
        name: '서초 고운빛피부과의원',
        meta: '피부과 · 서초동',
        visited: true,
        lowestPrice: '165,000원',
      },
      {
        name: '반포 맑은결피부과의원',
        meta: '피부과 · 반포동',
        visited: false,
      },
    ],
    prices: [
      {
        name: '인모드 FX 풀페이스',
        discount: '-34%',
        original: '250,000원',
        price: '165,000원',
      },
      {
        name: '울쎄라 리프팅 300샷',
        discount: null,
        original: null,
        price: '1,100,000원',
      },
      {
        name: '피코토닝 1회',
        discount: null,
        original: null,
        price: '90,000원',
      },
    ],
    platforms: ['강남언니', '여신티켓', '바비톡', '굿닥'],
  },
  안과: {
    searchQuery: '강남역 안과',
    selectedHospital: '강남 밝은눈안과의원',
    selectedNeighborhood: '서울 강남구 역삼동',
    rating: '9.5',
    reviewCount: '840',
    listItems: [
      {
        name: '강남 밝은눈안과의원',
        meta: '안과 · 역삼동',
        visited: true,
        lowestPrice: '2,090,000원',
      },
      {
        name: '역삼 선명한안과의원',
        meta: '안과 · 역삼동',
        visited: false,
      },
    ],
    prices: [
      {
        name: '스마일라식 양안',
        discount: '-28%',
        original: '2,900,000원',
        price: '2,090,000원',
      },
      {
        name: '투데이라섹 양안',
        discount: null,
        original: null,
        price: '1,590,000원',
      },
      {
        name: '정밀 안종합검진',
        discount: null,
        original: null,
        price: '120,000원',
      },
    ],
    platforms: ['강남언니', '굿닥'],
  },
};

export function NaverMapPreview(): React.JSX.Element {
  const [activeSpecialty, setActiveSpecialty] = useState<SpecialtyKey>('치과');
  const scenario = PREVIEW_SCENARIOS[activeSpecialty];

  return (
    <div className="rounded-xl bg-white text-slate-900 shadow-xl overflow-hidden">
      {/* Browser Top Chrome */}
      <div className="bg-slate-100 border-b border-slate-200 px-3.5 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <span className="h-2 w-2 rounded-full bg-slate-300" />
          </div>
          <span className="text-[11px] font-medium text-slate-500 truncate">map.naver.com</span>
        </div>
        <span className="text-[11px] font-medium text-slate-400 shrink-0 whitespace-nowrap">
          가상 병원 예시 화면
        </span>
      </div>

      {/* Search Query & Specialty Switcher */}
      <div className="bg-white border-b border-slate-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Search className="h-3.5 w-3.5 text-[#2F6F55] shrink-0" aria-hidden="true" />
          <span className="text-xs font-bold text-slate-800 truncate">{scenario.searchQuery}</span>
        </div>

        <div
          role="tablist"
          aria-label="진료과별 네이버 지도 미리보기"
          className="flex items-center gap-1"
        >
          {SPECIALTY_KEYS.map((key) => {
            const isActive = activeSpecialty === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSpecialty(key)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1E2456] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      {/* Split Naver Map Sidebar + Detail Overlay */}
      <div className="grid grid-cols-1 sm:grid-cols-[176px_1fr] divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {/* Left: Search Result List with Inline Chips */}
        <div className="bg-slate-50/60 divide-y divide-slate-200">
          {scenario.listItems.map((item) => (
            <div
              key={item.name}
              className={`p-3.5 space-y-2 ${item.visited ? 'bg-white' : 'bg-transparent'}`}
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                <p className="text-[11px] text-slate-500">{item.meta}</p>
              </div>
              <div>
                {item.visited ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1B5E43] tabular-nums whitespace-nowrap">
                    ✓ 최저 {item.lowestPrice} ↗
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E2456] whitespace-nowrap">
                    <BrandInfinityIcon size={12} className="text-[#1E2456] shrink-0" />
                    <span>가격 비교 ↗</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Place Detail Header + Medi Bridge Card Overlay */}
        <div className="bg-white p-4 space-y-3 min-w-0">
          {/* Simulated Place Header */}
          <div className="border-b border-slate-100 pb-2.5 space-y-2">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{scenario.selectedHospital}</h2>
              <p className="text-[11px] text-slate-500">{scenario.selectedNeighborhood}</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="font-bold text-slate-900 border-b-2 border-slate-900 pb-0.5">
                홈
              </span>
              <span className="pb-0.5">리뷰</span>
              <span className="pb-0.5">사진</span>
              <span className="pb-0.5">정보</span>
            </div>
          </div>

          {/* Medi Bridge Injected Overlay */}
          <div className="border-l-2 border-[#1E2456] pl-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-extrabold text-[#1E2456]">
                  메디브릿지 · 모두닥
                </span>
                <span className="text-xs font-bold text-amber-600 tabular-nums">
                  ★ {scenario.rating}
                </span>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  인증리뷰 {scenario.reviewCount}건
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#1E2456] whitespace-nowrap">
                리뷰 보기 ↗
              </span>
            </div>

            <div className="divide-y divide-slate-100 border-y border-slate-100 text-xs">
              {scenario.prices.map((row) => (
                <div key={row.name} className="py-1.5 flex items-center justify-between gap-2">
                  <span className="text-slate-700 font-medium truncate">{row.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                    {row.discount && (
                      <span className="rounded bg-[#EFF7F2] px-1.5 py-0.5 text-[10px] font-bold text-[#1B5E43] tabular-nums">
                        {row.discount}
                      </span>
                    )}
                    {row.original && (
                      <span className="text-[11px] text-slate-400 line-through tabular-nums">
                        {row.original}
                      </span>
                    )}
                    <span className="font-bold text-slate-900 tabular-nums">{row.price}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
              <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                다른 앱 검색
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {scenario.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="rounded-md bg-[#EEF0FA] px-2 py-0.5 text-[11px] font-semibold text-[#1E2456] whitespace-nowrap"
                  >
                    {platform} ↗
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
