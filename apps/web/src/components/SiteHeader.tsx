import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';
import { CHROME_STORE_URL, HAS_CHROME_STORE_URL } from '@/lib/siteConfig';

export function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2F377A] bg-[#1E2456] text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="메디브릿지 홈">
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
        </Link>

        <nav
          aria-label="주요 메뉴"
          className="flex items-center gap-1 sm:gap-3 text-xs sm:text-sm whitespace-nowrap"
        >
          <Link
            href="/#screens"
            className="rounded-lg px-2 sm:px-2.5 py-1.5 font-medium text-indigo-100 hover:bg-[#252D6B] hover:text-white transition"
          >
            작동 화면
          </Link>
          <Link
            href="/#departments"
            className="hidden sm:inline-flex rounded-lg px-2.5 py-1.5 font-medium text-indigo-100 hover:bg-[#252D6B] hover:text-white transition"
          >
            지원 진료과
          </Link>
          <Link
            href="/#install"
            className="hidden sm:inline-flex rounded-lg px-2.5 py-1.5 font-medium text-indigo-100 hover:bg-[#252D6B] hover:text-white transition"
          >
            설치 안내
          </Link>

          {HAS_CHROME_STORE_URL ? (
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#86B898] px-3 py-1.5 text-xs font-bold text-[#142038] hover:bg-[#9AC7AA] transition shrink-0 whitespace-nowrap"
            >
              Chrome에 추가 ↗
            </a>
          ) : (
            <Link
              href="/#install"
              className="rounded-lg bg-[#86B898] px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-[#142038] hover:bg-[#9AC7AA] transition shrink-0 whitespace-nowrap"
            >
              <span className="sm:hidden">심사 중 · 체험</span>
              <span className="hidden sm:inline">웹 스토어 심사 중</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
