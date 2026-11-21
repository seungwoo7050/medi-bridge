import Image from 'next/image';
import type React from 'react';
import { CopyInstallLinkButton } from '@/components/MobileCopyLinkBar';
import {
  CHROME_STORE_URL,
  EXTENSION_ZIP_URL,
  GITHUB_REPO_URL,
  HAS_CHROME_STORE_URL,
} from '@/lib/siteConfig';

const SUPPORTED_DEPARTMENTS = [
  {
    group: '피부과 · 성형외과',
    platforms: '모두닥 · 강남언니 · 여신티켓 · 바비톡 가격 수집, 굿닥 검색',
  },
  {
    group: '치과 · 안과',
    platforms: '모두닥 · 강남언니 · 여신티켓 가격 수집, 굿닥 검색',
  },
  {
    group: '정형외과',
    platforms: '모두닥 가격 · 병원 신고 정가 수집, 굿닥 검색',
  },
] as const;

const PRIVACY_ASSURANCES = [
  {
    title: '계정과 서버 없이 브라우저 안에서만 동작',
    detail:
      '회원가입이나 로그인 쿠키, 별도 수집 서버 없이 Chrome 확장프로그램 단독으로 실행됩니다.',
  },
  {
    title: '클릭한 병원만 조회하고 PC에만 저장',
    detail:
      '검색 목록을 훑을 때는 외부 요청을 보내지 않고, 최근 본 병원 20건과 요약 캐시만 로컬에 보관합니다.',
  },
  {
    title: '네이버 지도와 공개 의료 플랫폼 7곳만 허용',
    detail:
      '네이버 지도 및 모두닥·강남언니·여신티켓·바비톡 공개 도메인 외의 권한은 요구하지 않습니다.',
  },
] as const;

export function ExtensionLanding(): React.JSX.Element {
  return (
    <div className="mb-dark-stage text-slate-100">
      {/* 1. Split Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-10 pb-14 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] items-center gap-10 lg:gap-12">
          <div>
            <p className="flex items-center gap-2.5 text-xs font-semibold tracking-wider text-[#86B898]">
              <span className="inline-block h-px w-6 bg-[#86B898]/70" aria-hidden="true" />
              네이버 지도 병원 비급여 최저가 비교
            </p>

            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.16] text-white break-keep">
              이 병원 시술비,
              <span className="mt-1.5 block text-[#86B898]">앱마다 왜 다를까요?</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm sm:text-base text-slate-300 leading-relaxed break-keep">
              네이버 지도에서 병원을 고르면 모두닥·강남언니·여신티켓·바비톡 이벤트가와 병원 신고
              정가를 부가세 10% 포함 가격순으로 보여줍니다.
            </p>

            <p className="mt-4 text-xs font-medium text-slate-400">
              무료 · 회원가입 및 별도 수집 서버 없음 · Chrome MV3 확장프로그램
            </p>

            <div className="mt-7 max-w-md space-y-2.5">
              {HAS_CHROME_STORE_URL ? (
                <a
                  href={CHROME_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-between rounded-xl bg-[#86B898] px-5 py-3.5 text-left text-[#0D1528] hover:bg-[#9AC7AA] transition"
                >
                  <span className="block">
                    <span className="block text-[11px] font-semibold opacity-80">
                      PC Chrome 브라우저
                    </span>
                    <span className="block text-sm sm:text-base font-extrabold">
                      Chrome 웹 스토어에서 받기
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-base font-bold">
                    ↗
                  </span>
                </a>
              ) : (
                <a
                  href="#install"
                  className="flex w-full items-center justify-between rounded-xl bg-[#86B898] px-5 py-3.5 text-left text-[#0D1528] hover:bg-[#9AC7AA] transition"
                >
                  <span className="block">
                    <span className="block text-[11px] font-semibold opacity-80">
                      PC Chrome 브라우저
                    </span>
                    <span className="block text-sm sm:text-base font-extrabold">
                      설치 방법 및 체험 패키지 받기
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-base font-bold">
                    ↓
                  </span>
                </a>
              )}

              <CopyInstallLinkButton
                label="PC 설치 링크 복사"
                copiedLabel="✓ 링크가 복사되었습니다"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-white/[0.08] transition cursor-pointer"
              />
            </div>
          </div>

          <figure className="mx-auto w-full max-w-[420px] rounded-2xl border border-white/15 bg-[#161D42] p-2 shadow-2xl">
            <Image
              src="/screenshots/hero-drawer-closeup.png"
              alt="네이버 지도 검색 목록에서 열린 메디 브릿지 플랫폼별 최저가 비교 창 클로즈업"
              width={924}
              height={1320}
              priority
              className="block w-full h-auto rounded-xl"
            />
          </figure>
        </div>
      </section>

      {/* 2. Alternating Real-Screen Showcase Deck */}
      <section id="showcase" className="scroll-mt-16 border-t border-white/10">
        <div className="mx-auto max-w-5xl px-4 pt-14 pb-6 sm:pt-20">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white break-keep">
            검색 목록부터 상세 탭까지, 보던 지도에서 바로 가격 비교
          </h2>
          <p className="mt-2.5 max-w-2xl text-sm sm:text-base text-slate-400 leading-relaxed break-keep">
            검색 결과 옆 비교 창으로 시술별 최저가를 확인하고, 병원 상세 화면과 툴바 팝업에서 다시
            찾아봅니다.
          </p>

          <div className="mt-10 sm:mt-14 divide-y divide-white/10">
            {/* Row 1: Text Left · Full Map Drawer Right */}
            <div className="py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-[0.88fr_1.12fr] items-center gap-8 lg:gap-12">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#86B898]">
                  검색 목록 비교
                </p>
                <h3 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-white break-keep">
                  검색 목록에서 플랫폼별 최저가를 바로 엽니다
                </h3>
                <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed break-keep">
                  병원 이름 아래 ‘가격 비교’ 버튼을 누르면 그 자리에 시술별 가격 비교 창이 열립니다.
                  플랫폼별 이벤트가와 병원 신고 정가를 최저가순으로 확인한 뒤 해당 페이지로 이동할
                  수 있습니다.
                </p>
              </div>

              <figure className="rounded-2xl border border-white/15 bg-[#161D42] p-2 shadow-xl">
                <Image
                  src="/screenshots/naver-drawer.png"
                  alt="네이버 지도 전체 화면 위에서 열린 시술별 최저가 비교 창"
                  width={2720}
                  height={1720}
                  className="block w-full h-auto rounded-xl"
                />
              </figure>
            </div>

            {/* Row 2: Detail Panel Left · Text Right */}
            <div className="py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] items-center gap-8 lg:gap-12">
              <figure className="order-2 lg:order-1 mx-auto w-full max-w-[400px] rounded-2xl border border-white/15 bg-[#161D42] p-2 shadow-xl">
                <Image
                  src="/screenshots/showcase-detail-panel.png"
                  alt="네이버 지도 병원 상세 및 사진 탭 상단에 표시된 메디 브릿지 최저가 비교 카드"
                  width={768}
                  height={1520}
                  className="block w-full h-auto rounded-xl"
                />
              </figure>

              <div className="order-1 lg:order-2">
                <p className="text-xs font-semibold tracking-wider text-[#86B898]">
                  상세 · 사진 탭 가격표
                </p>
                <h3 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-white break-keep">
                  병원 상세와 사진 탭 상단에 가격표를 표시합니다
                </h3>
                <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed break-keep">
                  병원을 선택하면 상세 홈과 사진 탭 상단에 4개 플랫폼 이벤트가와 병원 신고 정가가
                  함께 나옵니다. 시술 분류 탭으로 필요한 항목만 골라 볼 수 있습니다.
                </p>
              </div>
            </div>

            {/* Row 3: Text Left · Extension Popup Right */}
            <div className="py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] items-center gap-8 lg:gap-12">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#86B898]">
                  부가세 10% 합산 · 열람 기록
                </p>
                <h3 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-white break-keep">
                  부가세 10% 포함가로 맞추고, 최근 본 병원 20곳을 남깁니다
                </h3>
                <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed break-keep">
                  부가세 별도 표기 상품에 10%를 더해 실제 결제 금액 기준으로 순위를 매깁니다. 확인한
                  병원은 우측 상단 확장프로그램 팝업에 최근 20곳까지 저장되어 다시 열 수 있습니다.{' '}
                  <a
                    href="/vat"
                    className="font-semibold text-[#86B898] hover:underline whitespace-nowrap"
                  >
                    별도 계산기 열기 →
                  </a>
                </p>
              </div>

              <figure className="mx-auto w-full max-w-[360px] rounded-2xl border border-white/15 bg-[#161D42] p-2 shadow-xl">
                <Image
                  src="/screenshots/showcase-popup.png"
                  alt="최근 비교한 병원 목록과 실시간 연동 스위치가 표시된 메디 브릿지 툴바 팝업"
                  width={704}
                  height={926}
                  className="block w-full h-auto rounded-xl"
                />
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Compact Editorial Spec Rows */}
      <div className="mx-auto max-w-5xl px-4 border-t border-white/10 divide-y divide-white/10">
        <section
          id="scope"
          className="scroll-mt-20 py-12 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 md:gap-12"
        >
          <div>
            <h2 className="text-lg font-bold text-white">연동 범위</h2>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed break-keep">
              피부과·성형외과·치과·안과·정형외과 5곳에서만 동작하며, 일반 음식점·카페·동물병원에는
              표시되지 않습니다.
            </p>
          </div>

          <div className="divide-y divide-white/10 border-y border-white/10">
            {SUPPORTED_DEPARTMENTS.map((item) => (
              <div
                key={item.group}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-6 text-xs sm:text-sm"
              >
                <span className="font-bold text-white shrink-0">{item.group}</span>
                <span className="text-slate-300 break-keep sm:text-right">{item.platforms}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 md:gap-12">
          <div>
            <h2 className="text-lg font-bold text-white">동작 및 개인정보</h2>
            <a
              href="/privacy"
              className="mt-2 inline-block text-xs font-semibold text-[#86B898] hover:underline"
            >
              개인정보처리방침 전문 →
            </a>
          </div>

          <div className="divide-y divide-white/10">
            {PRIVACY_ASSURANCES.map((item, idx) => (
              <div key={item.title} className={`${idx === 0 ? 'pb-4' : 'py-4'} space-y-1`}>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed break-keep">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 4. Closing Install Band */}
      <section id="install" className="scroll-mt-16 border-t border-white/10 bg-[#0C1026]">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white break-keep">
            Chrome에 추가하고 네이버 지도에서 바로 확인하세요
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm text-slate-400">
            {HAS_CHROME_STORE_URL
              ? '설치 후 바로 사용 가능 · 무료'
              : '현재 Chrome 웹 스토어 심사 중이며, 아래 압축 파일로 먼저 설치해 사용할 수 있습니다.'}
          </p>

          {HAS_CHROME_STORE_URL ? (
            <ol className="my-8 divide-y divide-white/10 border-y border-white/10 text-left text-xs sm:text-sm text-slate-300">
              <li className="py-3.5 leading-relaxed break-keep">
                <strong className="text-white">1. 확장프로그램 추가:</strong> Chrome 웹 스토어에서
                메디브릿지를 추가합니다.
              </li>
              <li className="py-3.5 leading-relaxed break-keep">
                <strong className="text-white">2. 툴바 핀 고정:</strong> 우측 상단 퍼즐 아이콘에서
                고정하면 최근 본 병원을 바로 엽니다.
              </li>
              <li className="py-3.5 leading-relaxed break-keep">
                <strong className="text-white">3. 네이버 지도에서 사용:</strong> 지도 목록 옆{' '}
                <strong className="text-white">‘가격 비교’</strong> 버튼으로 최저가를 확인합니다.
              </li>
            </ol>
          ) : (
            <ol className="my-8 divide-y divide-white/10 border-y border-white/10 text-left text-xs sm:text-sm text-slate-300">
              <li className="py-3.5 leading-relaxed break-keep">
                <strong className="text-white">1. 체험 패키지 받기:</strong> 아래 버튼으로
                확장프로그램 ZIP 파일을 내려받아 압축을 풉니다.
              </li>
              <li className="py-3.5 leading-relaxed break-keep">
                <strong className="text-white">2. Chrome에 불러오기:</strong> 주소창에{' '}
                <code className="text-[#86B898] font-mono">chrome://extensions</code> 입력 후 우측
                상단 개발자 모드를 켜고, 압축 해제된 폴더를 선택합니다.
              </li>
              <li className="py-3.5 leading-relaxed break-keep">
                <strong className="text-white">3. 네이버 지도에서 바로 사용:</strong> 지도 목록 옆{' '}
                <strong className="text-white">‘가격 비교’</strong> 버튼으로 플랫폼별 최저가를
                확인합니다.
              </li>
            </ol>
          )}

          <div className="mx-auto max-w-md space-y-2.5">
            {HAS_CHROME_STORE_URL ? (
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#86B898] px-5 py-3.5 text-sm font-extrabold text-[#0D1528] hover:bg-[#9AC7AA] transition whitespace-nowrap"
              >
                <span>Chrome 웹 스토어에서 추가하기 ↗</span>
              </a>
            ) : (
              <a
                href={EXTENSION_ZIP_URL}
                download="medi-bridge-chrome-mv3.zip"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#86B898] px-5 py-3.5 text-sm font-extrabold text-[#0D1528] hover:bg-[#9AC7AA] transition whitespace-nowrap"
              >
                <span>체험 패키지 ZIP 내려받기 ↓</span>
              </a>
            )}

            <CopyInstallLinkButton
              label="PC 설치용 페이지 링크 복사"
              copiedLabel="✓ 링크가 복사되었습니다"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-white/[0.08] transition cursor-pointer whitespace-nowrap"
            />

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="pt-2 inline-block text-xs font-semibold text-slate-400 hover:text-white hover:underline"
            >
              GitHub 소스 코드 ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
