import Image from 'next/image';
import type React from 'react';
import { CHROME_STORE_URL, HAS_CHROME_STORE_URL } from '@/lib/siteConfig';

export function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#121738]/95 backdrop-blur text-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <a href="/" className="flex items-center gap-2 shrink-0" aria-label="메디브릿지 홈">
          <Image
            src="/brand/medi-bridge-symbol.png"
            alt=""
            width={38}
            height={18}
            className="h-[18px] w-auto shrink-0"
            priority
          />
          <Image
            src="/brand/medi-bridge-wordmark-ko.png"
            alt="메디브릿지"
            width={99}
            height={18}
            className="h-[15px] sm:h-[17px] w-auto shrink-0"
            priority
          />
        </a>

        <nav
          aria-label="주요 메뉴"
          className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm whitespace-nowrap"
        >
          <a
            href="/#showcase"
            className="hidden sm:inline-block font-medium text-indigo-100 hover:text-white transition"
          >
            주요 화면
          </a>
          <a
            href="/#scope"
            className="hidden sm:inline-block font-medium text-indigo-100 hover:text-white transition"
          >
            연동 범위
          </a>
          <a
            href="/#install"
            className="hidden sm:inline-block font-medium text-indigo-100 hover:text-white transition"
          >
            설치 방법
          </a>

          {HAS_CHROME_STORE_URL ? (
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#86B898] px-3 py-1.5 text-xs font-bold text-[#0F172A] hover:bg-[#9AC7AA] transition shrink-0 whitespace-nowrap"
            >
              Chrome에 추가 ↗
            </a>
          ) : (
            <a
              href="/#install"
              className="rounded-lg bg-[#86B898] px-3 py-1.5 text-xs font-bold text-[#0F172A] hover:bg-[#9AC7AA] transition shrink-0 whitespace-nowrap"
            >
              <span className="sm:hidden">체험 설치</span>
              <span className="hidden sm:inline">웹 스토어 심사 중</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
