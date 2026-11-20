import { BrandInfinityIcon, ToolbarPinGuideGraphic } from '@medi-bridge/ui';
import { ArrowRight, CheckCircle2, Layers, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { SavingsSimulator } from '@/components/SavingsSimulator';

export default function IntroLandingPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      {/* Hero */}
      <section className="rounded-2xl bg-[#1E2456] text-white p-7 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center gap-2.5">
            <BrandInfinityIcon size={24} className="text-white" />
            <span className="text-xs font-semibold text-[#86B898]">
              Chrome 확장프로그램 + 가격 비교 웹
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight break-keep">
            네이버 지도 위에서 3초 만에
            <br />
            부가세 뺀 가격 거품 걸러내기
          </h1>

          <p className="text-sm sm:text-base text-indigo-100/85 max-w-xl leading-relaxed break-keep">
            병원을 찾을 때마다 모두닥·강남언니·여신티켓·바비톡·굿닥 앱을 번갈아 검색할 필요가
            없습니다. 메디 브릿지는 네이버 지도 상세 화면과 검색 목록 위에서 같은 시술의 실제 결제
            금액만 바로 비교해 줍니다.
          </p>

          <div id="install" className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#86B898] px-5 py-3 text-sm font-bold text-[#142038] hover:bg-[#9AC7AA] transition"
            >
              <span>시술별 병원 가격 비교하기</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-300/30 bg-[#252D6B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2F3984] transition"
            >
              <span>권한 및 개인정보 정책</span>
            </Link>
          </div>
        </div>

        {/* Clean Single Preview Card (zero nested boxes) */}
        <div className="lg:col-span-5 rounded-xl bg-white text-slate-900 p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">강남케이안과의원</h2>
              <p className="text-[11px] text-slate-500">강남역 3번 출구 도보 2분</p>
            </div>
            <span className="rounded-md bg-[#EFF7F2] px-2 py-0.5 text-[11px] font-bold text-[#1B5E43] tabular-nums">
              -40%
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>병원 신고 정가 · 스마일라식 (양안)</span>
            <span className="line-through tabular-nums text-slate-400 whitespace-nowrap shrink-0">
              3,500,000원
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2 flex items-center justify-between gap-2 font-bold text-[#1B5E43]">
              <span>모두닥 · 부가세 포함</span>
              <span className="tabular-nums whitespace-nowrap shrink-0">2,090,000원</span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2 text-slate-700">
              <span>강남언니 · 1,950,000원 + 부가세 10%</span>
              <span className="font-semibold tabular-nums whitespace-nowrap shrink-0">
                2,145,000원
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2 text-slate-700">
              <span>굿닥 · 부가세 포함</span>
              <span className="font-semibold tabular-nums whitespace-nowrap shrink-0">
                2,200,000원
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            * 지도 목록 탐색 시 자동 대량 조회를 하지 않으며, 병원 선택 시에만 가격을 불러옵니다.
          </p>
        </div>
      </section>

      {/* Interactive Simulator */}
      <SavingsSimulator />

      {/* Trust Pillars & Onboarding */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-2">
          <ShieldCheck className="h-5 w-5 text-[#1E2456]" />
          <h3 className="text-sm font-bold text-slate-900">동명 병원 오매칭 차단</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            같은 이름의 다른 지점과 헷갈리지 않도록 요양기관 기호, 도로명 주소, 거리 조건을 함께
            확인해 정확한 병원의 가격만 연결합니다.
          </p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-2">
          <Layers className="h-5 w-5 text-[#1B5E43]" />
          <h3 className="text-sm font-bold text-slate-900">네이버 지도 화면 유지</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            네이버 지도 디자인과 섞이지 않는 독립 카드로 가격표와 주변 병원 최저가 보드를 띄워 기존
            탐색 화면을 가리지 않습니다.
          </p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#1B5E43]" />
            <h3 className="text-sm font-bold text-slate-900">확장프로그램 툴바 고정</h3>
          </div>
          <ToolbarPinGuideGraphic />
          <p className="text-xs text-slate-600">
            Chrome 우측 상단 퍼즐 아이콘에서 메디 브릿지 핀을 고정하면 지도 활성 상태 아이콘을 바로
            확인할 수 있습니다.
          </p>
        </div>
      </section>
    </div>
  );
}
