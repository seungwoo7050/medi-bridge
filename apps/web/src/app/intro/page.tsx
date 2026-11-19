import { BestPriceBadge, HiraVerifiedBadge, ToolbarPinGuideGraphic } from '@medi-bridge/ui';
import { ArrowRight, CheckCircle2, Layers, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';
import { SavingsSimulator } from '@/components/SavingsSimulator';

export default function IntroLandingPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      {/* Hero */}
      <section className="rounded-3xl bg-[#1E2456] text-white p-7 sm:p-10 shadow-lg grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Image
              src="/brand/medi-bridge-symbol.png"
              alt=""
              width={44}
              height={21}
              className="h-5 w-auto"
            />
            <span className="rounded-full bg-[#252D6B] border border-indigo-400/30 px-3 py-1 text-xs font-semibold text-[#86B898]">
              Chrome Extension MV3 + 통합 가격 웹
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
            네이버 지도 위에서 3초 만에
            <br />
            심평원 정가와 5개 앱 최저가 대조
          </h1>

          <p className="text-sm sm:text-base text-indigo-100/85 max-w-xl leading-relaxed">
            병원을 찾을 때마다 모두닥·강남언니·여신티켓·바비톡·굿닥 앱을 번갈아 검색할 필요가
            없습니다. 메디 브릿지는 네이버 지도 상세 패널과 검색 반경 위에 VAT 정규화 가격표를 바로
            띄워줍니다.
          </p>

          <div id="install" className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#86B898] px-5 py-3 text-sm font-extrabold text-[#142038] hover:bg-[#9AC7AA] transition"
            >
              <span>웹에서 바로 병원 가격 비교</span>
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

        {/* Overlay Preview Bento Card */}
        <div className="lg:col-span-5 rounded-2xl bg-white/95 text-slate-900 p-5 shadow-xl space-y-3 border border-[#C7CEEB]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#1E2456]">
              네이버 지도 #entryIframe 예시
            </span>
            <HiraVerifiedBadge compact />
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">강남케이안과의원</span>
              <BestPriceBadge label="정가 대비 40%↓" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>심평원 스마일라식 정가</span>
              <span className="line-through">350만원</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-[#2F6F55]">
              <span>모두닥 (VAT 포함 최저가)</span>
              <span>209만원</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>강남언니 (195만원 VAT별도 → 환산)</span>
              <span>214.5만원</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            * 목록 초기 진입 시 자동 대량 크롤링 0건, 상세 클릭·보드 요청 시에만 온디맨드
            조회합니다.
          </p>
        </div>
      </section>

      {/* Interactive Simulator */}
      <SavingsSimulator />

      {/* Trust Pillars & Onboarding */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-2">
          <ShieldCheck className="h-5 w-5 text-[#1E2456]" />
          <h3 className="text-sm font-bold text-slate-900">심평원 요양기호·시/도 교차 매칭</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            동명 병원이나 광고 슬롯 오매칭을 막기 위해 암호화 요양기호(ykiho), 도로명 주소, 위경도
            좌표 거리를 결합해 검증합니다.
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-2">
          <Layers className="h-5 w-5 text-[#2F6F55]" />
          <h3 className="text-sm font-bold text-slate-900">Shadow DOM 격리 · 반경 드로어</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            네이버 지도 CSS와 충돌하지 않는 Shadow DOM 안에 카드와 반경 최저가 비교 드로어를 띄워
            원본 화면을 해치지 않습니다.
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#2F6F55]" />
            <h3 className="text-sm font-bold text-slate-900">확장프로그램 툴바 고정 안내</h3>
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
