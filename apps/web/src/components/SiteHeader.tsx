import { BrandInfinityIcon } from '@medi-bridge/ui';
import Link from 'next/link';
import type React from 'react';

export function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2F377A] bg-[#1E2456] text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 sm:gap-4 px-3.5 sm:px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-2.5 shrink-0"
          aria-label="메디 브릿지 홈"
        >
          <BrandInfinityIcon size={24} className="text-white shrink-0" />
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-white whitespace-nowrap">
            메디 브릿지
          </span>
        </Link>

        <nav
          aria-label="주요 메뉴"
          className="flex items-center gap-1 sm:gap-3 text-xs sm:text-sm whitespace-nowrap"
        >
          <Link
            href="/"
            className="rounded-lg px-2 sm:px-2.5 py-1.5 font-medium text-indigo-100 hover:bg-[#252D6B] hover:text-white transition"
          >
            가격 비교
          </Link>
          <Link
            href="/intro"
            className="rounded-lg px-2 sm:px-2.5 py-1.5 font-medium text-indigo-100 hover:bg-[#252D6B] hover:text-white transition"
          >
            <span className="sm:hidden">확장프로그램</span>
            <span className="hidden sm:inline">크롬 확장프로그램</span>
          </Link>
          <Link
            href="/intro#install"
            className="rounded-lg bg-[#86B898] px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-[#142038] hover:bg-[#9AC7AA] transition shrink-0 whitespace-nowrap"
          >
            Chrome에 추가
          </Link>
        </nav>
      </div>
    </header>
  );
}
