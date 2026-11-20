import { BrandInfinityIcon, ToolbarPinGuideGraphic } from '@medi-bridge/ui';
import { ArrowRight, CheckCircle2, Layers, MapPinCheck, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { SavingsSimulator } from '@/components/SavingsSimulator';

const SAMPLE_PRICES = [
  {
    name: '오스템 임플란트 (국산)',
    discount: '-41%',
    original: '1,850,000원',
    price: '1,100,000원',
  },
  {
    name: '원데이 세라믹 인레이',
    discount: null,
    original: null,
    price: '350,000원',
  },
  {
    name: '맞춤 지르코니아 크라운',
    discount: null,
    original: null,
    price: '550,000원',
  },
] as const;

const SAMPLE_PLATFORMS = ['강남언니', '굿닥'] as const;

export function ExtensionLanding(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-12">
      {/* Hero */}
      <section className="rounded-2xl bg-[#1E2456] text-white p-7 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center gap-2.5">
            <BrandInfinityIcon size={24} className="text-white shrink-0" />
            <span className="text-xs font-semibold text-[#86B898]">
              Chrome 확장프로그램 · 네이버 지도 실시간 연동
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight break-keep">
            네이버 지도 위에서 바로
            <br />
            전국 병원 비급여 가격·리뷰 확인
          </h1>

          <p className="text-sm sm:text-base text-indigo-100/85 max-w-xl leading-relaxed break-keep">
            병원을 찾을 때마다 모두닥·강남언니·여신티켓·바비톡·굿닥 앱을 번갈아 검색할 필요가
            없습니다. 네이버 지도에서 병원을 누르면 같은 지역의 모두닥 인증 리뷰와 공개 비급여
            가격표, 타 플랫폼 검색 링크를 바로 보여줍니다.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="#install"
              className="inline-flex items-center gap-2 rounded-xl bg-[#86B898] px-5 py-3 text-sm font-bold text-[#142038] hover:bg-[#9AC7AA] transition whitespace-nowrap"
            >
              <span>Chrome 확장프로그램 설치 안내</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </a>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-300/30 bg-[#252D6B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2F3984] transition whitespace-nowrap"
            >
              <span>권한 및 개인정보 정책</span>
            </Link>
          </div>
        </div>

        {/* Extension Card Showcase (single card, hairline rows, zero nested borders) */}
        <div className="lg:col-span-5 rounded-xl bg-white text-slate-900 p-5 shadow-md space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-[#1E2456]">메디 브릿지 · 모두닥</p>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                드라마치과병원 <span className="font-normal text-slate-500">· 성남 분당구</span>
              </h2>
            </div>
            <div className="text-right shrink-0 whitespace-nowrap">
              <span className="text-xs font-bold text-amber-600 tabular-nums">★ 9.2</span>
              <p className="text-[11px] text-slate-500 tabular-nums">인증리뷰 1,420건</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border-y border-slate-100 text-xs">
            {SAMPLE_PRICES.map((item) => (
              <div key={item.name} className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-700 font-medium truncate">{item.name}</span>
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  {item.discount && (
                    <span className="rounded bg-[#EFF7F2] px-1.5 py-0.5 text-[10px] font-bold text-[#1B5E43] tabular-nums">
                      {item.discount}
                    </span>
                  )}
                  {item.original && (
                    <span className="text-[11px] text-slate-400 line-through tabular-nums">
                      {item.original}
                    </span>
                  )}
                  <span className="font-bold text-slate-900 tabular-nums">{item.price}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
              다른 플랫폼 검색
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_PLATFORMS.map((platform) => (
                <span
                  key={platform}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#1E2456] whitespace-nowrap"
                >
                  {platform} ↗
                </span>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 break-keep">
            * 위 화면은 확장프로그램 카드 예시이며, 실제 사용 시 네이버 지도에서 선택한 병원의
            지역·상호를 기준으로 실시간 조회합니다.
          </p>
        </div>
      </section>

      {/* How It Works & Trust Pillars */}
      <section id="how-it-works" className="scroll-mt-20 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            전국 어느 동네 병원을 눌러도 정확하게 연결되는 이유
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 break-keep">
            미리 저장한 일부 지역 샘플이 아니라, 네이버 지도에서 선택한 병원의 상호와 행정구역을
            실시간으로 확인해 매칭합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-2.5">
            <MapPinCheck className="h-5 w-5 text-[#1E2456]" />
            <h3 className="text-sm font-bold text-slate-900">행정구역 기반 동명 병원 차단</h3>
            <p className="text-xs text-slate-600 leading-relaxed break-keep">
              같은 상호의 다른 지점과 헷갈리지 않도록 앞글자 접두 일치와 시·구 행정구역 호환성을
              함께 검증하고, 주소 정보가 없으면 섣불리 미등록 캐시를 저장하지 않습니다.
            </p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-2.5">
            <Layers className="h-5 w-5 text-[#1B5E43]" />
            <h3 className="text-sm font-bold text-slate-900">썸네일·사진 뷰에서도 지역 유지</h3>
            <p className="text-xs text-slate-600 leading-relaxed break-keep">
              검색 목록 썸네일을 눌러 주소 DOM이 없는 사진 탭으로 이동해도, 목록 프레임에서 추출한
              행정구역을 백그라운드로 이어받아 같은 지역 병원으로 정확히 조회합니다.
            </p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-2.5">
            <ShieldCheck className="h-5 w-5 text-[#1E2456]" />
            <h3 className="text-sm font-bold text-slate-900">별도 백엔드 없는 최소 권한</h3>
            <p className="text-xs text-slate-600 leading-relaxed break-keep">
              회원가입이나 자체 비교 서버 없이 Chrome 확장프로그램 내부에서 네이버 지도와 모두닥
              공개 페이지만 직접 연결하며, 기록은 사용자 브라우저 안에만 보관됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive VAT Simulator */}
      <section id="simulator" className="scroll-mt-20">
        <SavingsSimulator />
      </section>

      {/* Install & Pin Onboarding */}
      <section
        id="install"
        className="scroll-mt-20 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
      >
        <div className="md:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#1B5E43]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>3단계로 바로 시작하기</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Chrome 확장프로그램 설치 및 툴바 고정
          </h2>
          <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600 list-decimal list-inside leading-relaxed break-keep">
            <li>
              <strong className="text-slate-900">확장프로그램 추가:</strong> Chrome 웹 스토어에서
              &lsquo;메디 브릿지&rsquo;를 추가합니다. (치과·안과·피부과·정형외과·성형외과 자동 지원)
            </li>
            <li>
              <strong className="text-slate-900">툴바 핀 고정:</strong> 브라우저 우측 상단 퍼즐
              아이콘을 눌러 메디 브릿지 핀을 고정하면 ON/OFF 상태와 최근 본 병원을 바로 엽니다.
            </li>
            <li>
              <strong className="text-slate-900">네이버 지도 탐색:</strong> 지도 목록 옆{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-[#1E2456]">
                가격 비교 ↗
              </code>{' '}
              칩과 병원 상세 카드의 비급여 가격·타 플랫폼 검색 링크를 바로 사용하세요.
            </li>
          </ol>
        </div>

        <div className="md:col-span-5 rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-3">
          <ToolbarPinGuideGraphic />
          <p className="text-xs text-slate-600 leading-relaxed break-keep">
            네이버 지도 목록을 훑기만 할 때는 외부 요청을 보내지 않고, 병원을 클릭해 상세 화면을
            열거나 칩을 눌렀을 때만 해당 병원을 조회합니다.
          </p>
        </div>
      </section>
    </div>
  );
}
