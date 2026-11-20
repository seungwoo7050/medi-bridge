import { ToolbarPinGuideGraphic } from '@medi-bridge/ui';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { CopyInstallLinkButton } from '@/components/MobileCopyLinkBar';
import { NaverMapPreview } from '@/components/NaverMapPreview';
import { CHROME_STORE_URL, GITHUB_RELEASE_URL, HAS_CHROME_STORE_URL } from '@/lib/siteConfig';

const SUPPORTED_DEPARTMENTS = [
  {
    group: '피부과 · 성형외과',
    platforms: '모두닥 가격·리뷰 + 강남언니 · 여신티켓 · 바비톡 · 굿닥',
  },
  {
    group: '치과 · 안과',
    platforms: '모두닥 가격·리뷰 + 강남언니 · 굿닥',
  },
  {
    group: '정형외과',
    platforms: '모두닥 가격·리뷰 + 굿닥',
  },
] as const;

const PRIVACY_ASSURANCES = [
  {
    title: '로그인·결제 정보 불필요',
    detail: '설치 즉시 무료로 사용하며 계정 가입이나 결제를 요구하지 않습니다.',
  },
  {
    title: '내 PC 브라우저에만 저장',
    detail: '최근 본 병원 기록과 ON/OFF 설정은 내 브라우저 안에만 남고 언제든 비울 수 있습니다.',
  },
  {
    title: '열어 본 병원만 확인',
    detail: '지도 목록을 훑어볼 때는 외부 요청을 보내지 않고 클릭한 병원만 조회합니다.',
  },
] as const;

export function ExtensionLanding(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-12">
      {/* Hero */}
      <section className="rounded-2xl bg-[#1E2456] text-white p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5 space-y-5">
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold leading-[1.22] tracking-tight break-keep">
            병원 이름 복사해서
            <br />앱 5개 뒤지던 시간,
            <br />
            <span className="text-[#86B898]">지도 클릭 한 번으로 끝</span>
          </h1>

          <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed break-keep">
            네이버 지도에서 치과·피부과·안과를 고르면 그 자리에서 모두닥 인증 리뷰와 비급여 가격표를
            바로 띄워 드립니다. 다른 앱 이벤트가도 병원명 재입력 없이 한 번에 열립니다.
          </p>

          <div className="space-y-2.5 pt-1">
            {HAS_CHROME_STORE_URL ? (
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#86B898] px-5 py-3 text-sm font-bold text-[#142038] hover:bg-[#9AC7AA] transition whitespace-nowrap"
              >
                <span>Chrome에 무료로 추가하기 ↗</span>
              </a>
            ) : (
              <a
                href="#install"
                className="inline-flex items-center gap-2 rounded-xl bg-[#86B898] px-5 py-3 text-sm font-bold text-[#142038] hover:bg-[#9AC7AA] transition whitespace-nowrap"
              >
                <span>Chrome 웹 스토어 심사 중 · 먼저 써보기</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            )}
            <p className="text-xs text-indigo-100/80 break-keep">
              회원가입 불필요 · 외부 서버 저장 없음 · 무료 Chrome 확장프로그램
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <NaverMapPreview />
        </div>
      </section>

      {/* Section 1: 3 Consumer Touchpoints */}
      <section id="screens" className="scroll-mt-20 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            네이버 지도를 켜 두면 세 곳에서 바로 작동합니다
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 break-keep">
            새 탭을 여러 개 띄워 병원 이름을 다시 입력하던 번거로움을 지도 화면 안으로 줄였습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <article className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between gap-4">
            <div className="border-b border-slate-100 pb-3.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">분당 바른미소치과의원</p>
                <p className="text-[11px] text-slate-500">치과 · 성남 분당구</p>
              </div>
              <span className="rounded-full bg-[#EEF0FA] px-2.5 py-1 text-[11px] font-bold text-[#1E2456] shrink-0 whitespace-nowrap">
                가격 비교 ↗
              </span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">검색 목록 옆 ‘가격 비교 ↗’ 버튼</h3>
              <p className="text-xs text-slate-600 leading-relaxed break-keep">
                지도 왼쪽 검색 목록마다 바로가기 버튼이 붙습니다. 한 번 확인한 병원은 대표 가격과
                체크 표시로 바로 구분됩니다.
              </p>
            </div>
          </article>

          <article className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between gap-4">
            <div className="border-b border-slate-100 pb-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1E2456]">모두닥 인증리뷰</span>
                <span className="font-bold text-amber-600 tabular-nums">★ 9.4 · 386건</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">국산 오스템 임플란트</span>
                <span className="font-bold text-slate-900 tabular-nums">990,000원</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">병원 상세·사진 탭 가격·리뷰 카드</h3>
              <p className="text-xs text-slate-600 leading-relaxed break-keep">
                병원을 누르거나 사진 탭을 볼 때도 같은 지역의 모두닥 별점과 비급여 가격표, 타 플랫폼
                검색 링크를 바로 보여줍니다.
              </p>
            </div>
          </article>

          <article className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between gap-4">
            <div className="border-b border-slate-100 pb-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">최근 확인한 병원</span>
                <span className="font-bold text-[#1B5E43]">연동 중</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="truncate">서초 고운빛피부과의원</span>
                <span className="text-[11px] text-slate-400 shrink-0">방금 전</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">툴바 팝업 최근 본 병원 기록</h3>
              <p className="text-xs text-slate-600 leading-relaxed break-keep">
                여러 곳을 비교한 뒤 헷갈릴 때 브라우저 상단 아이콘을 누르면 최근 본 병원 최대 20곳을
                다시 열고 기능을 껐다 켤 수 있습니다.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* Section 2: Supported Specialties & Privacy Summary */}
      <section id="departments" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              비급여 비교가 필요한 5개 진료과에서만 작동합니다
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed break-keep">
              일반 식당·카페·동물병원에서는 화면을 가리지 않고, 아래 5개 진료과 병원을 열었을 때만
              분야에 맞는 플랫폼을 연결합니다.
            </p>
          </div>

          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {SUPPORTED_DEPARTMENTS.map((item) => (
              <div
                key={item.group}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-xs"
              >
                <span className="font-bold text-slate-900 shrink-0">{item.group}</span>
                <span className="text-slate-600 break-keep sm:text-right">{item.platforms}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              회원가입도, 개인정보 수집 서버도 없습니다
            </h2>

            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {PRIVACY_ASSURANCES.map((item) => (
                <div key={item.title} className="py-2.5 space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed break-keep">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/privacy"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1E2456] hover:underline w-fit"
          >
            <span>개인정보처리방침 전문 보기 →</span>
          </Link>
        </div>
      </section>

      {/* Section 3: Install & Review Status */}
      <section
        id="install"
        className="scroll-mt-20 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:divide-x md:divide-slate-100 items-center"
      >
        <div className="md:col-span-7 space-y-4">
          {HAS_CHROME_STORE_URL ? (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Chrome 확장프로그램 설치 및 툴바 고정
                </h2>
                <span className="inline-flex items-center gap-1 rounded-md bg-[#EFF7F2] px-2 py-0.5 text-xs font-bold text-[#1B5E43] whitespace-nowrap">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>설치 가능</span>
                </span>
              </div>

              <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600 list-decimal list-inside leading-relaxed break-keep">
                <li>
                  <strong className="text-slate-900">확장프로그램 추가:</strong> Chrome 웹
                  스토어에서 &lsquo;메디브릿지&rsquo;를 추가합니다.
                </li>
                <li>
                  <strong className="text-slate-900">툴바 핀 고정:</strong> 브라우저 우측 상단 퍼즐
                  아이콘을 눌러 메디브릿지 핀을 고정하면 최근 본 병원을 바로 엽니다.
                </li>
                <li>
                  <strong className="text-slate-900">네이버 지도 탐색:</strong> 지도 목록 옆{' '}
                  <strong className="text-slate-900">&lsquo;가격 비교 ↗&rsquo; 버튼</strong>과 병원
                  상세의 비급여 가격 카드를 바로 사용하세요.
                </li>
              </ol>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={CHROME_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1E2456] px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#252D6B] transition whitespace-nowrap"
                >
                  <span>Chrome 웹 스토어에서 추가하기 ↗</span>
                </a>
                <CopyInstallLinkButton
                  label="PC 설치용 페이지 링크 복사"
                  copiedLabel="✓ 링크가 복사되었습니다"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#EFF7F2] px-4 py-2.5 text-xs sm:text-sm font-bold text-[#1B5E43] hover:bg-[#E1F1E7] transition cursor-pointer whitespace-nowrap"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Chrome 웹 스토어 출시 심사 중
                </h2>
                <span className="rounded-md bg-[#EFF7F2] px-2 py-0.5 text-xs font-bold text-[#1B5E43] whitespace-nowrap">
                  심사 진행 중
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
                정식 스토어 링크가 발급되기 전에도 PC Chrome 브라우저에서 체험용 패키지를
                불러오거나, 모바일에서 보셨다면 PC용 링크를 복사해 두실 수 있습니다.
              </p>

              <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600 list-decimal list-inside leading-relaxed break-keep">
                <li>
                  <strong className="text-slate-900">체험 패키지 받기:</strong> 아래 버튼에서 최신
                  확장프로그램 압축 파일을 내려받아 압축을 풉니다.
                </li>
                <li>
                  <strong className="text-slate-900">Chrome에 불러오기:</strong> 주소창에
                  chrome://extensions 입력 후 우측 상단 개발자 모드를 켜고, 압축 해제된 폴더를
                  선택합니다.
                </li>
                <li>
                  <strong className="text-slate-900">네이버 지도에서 바로 사용:</strong> 지도 목록
                  옆 <strong className="text-slate-900">&lsquo;가격 비교 ↗&rsquo; 버튼</strong>과
                  병원 상세 상단의 비급여 가격 카드를 바로 확인하세요.
                </li>
              </ol>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={GITHUB_RELEASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1E2456] px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#252D6B] transition whitespace-nowrap"
                >
                  <span>개발자 모드 체험 패키지 (GitHub) ↗</span>
                </a>
                <CopyInstallLinkButton
                  label="PC 설치용 페이지 링크 복사"
                  copiedLabel="✓ 링크가 복사되었습니다"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#EFF7F2] px-4 py-2.5 text-xs sm:text-sm font-bold text-[#1B5E43] hover:bg-[#E1F1E7] transition cursor-pointer whitespace-nowrap"
                />
              </div>
            </>
          )}
        </div>

        <div className="md:col-span-5 md:pl-8 space-y-3">
          <ToolbarPinGuideGraphic />
          <h3 className="text-sm font-bold text-slate-900">툴바 핀을 고정하면 훨씬 편합니다</h3>
          <p className="text-xs text-slate-600 leading-relaxed break-keep">
            브라우저 우측 상단 퍼즐 아이콘을 눌러 메디브릿지 핀을 고정해 두세요. 세이지 그린은 연동
            중, 회색은 일시 중지 상태를 뜻하며 클릭 한 번으로 최근 본 병원을 다시 엽니다.
          </p>
        </div>
      </section>
    </div>
  );
}
