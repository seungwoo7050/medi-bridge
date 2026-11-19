import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';

export function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2F377A] bg-[#1E2456] text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3 shrink-0" aria-label="메디 브릿지 홈">
          <Image
            src="/brand/medi-bridge-symbol.png"
            alt=""
            width={40}
            height={19}
            className="h-5 w-auto object-contain"
            priority
          />
          <div className="flex items-center gap-2">
            <Image
              src="/brand/medi-bridge-wordmark-en.png"
              alt="MEDI BRIDGE"
              width={132}
              height={16}
              className="h-3.5 w-auto object-contain"
              priority
            />
            <Image
              src="/brand/medi-bridge-wordmark-ko.png"
              alt="메디 브릿지"
              width={68}
              height={13}
              className="hidden sm:block h-3 w-auto object-contain opacity-90"
              priority
            />
          </div>
        </Link>

        <nav aria-label="주요 메뉴" className="flex items-center gap-2 sm:gap-5 text-xs sm:text-sm">
          <Link
            href="/"
            className="rounded-lg px-2.5 py-1.5 font-medium text-indigo-100 hover:bg-[#252D6B] hover:text-white transition"
          >
            가격 비교
          </Link>
          <Link
            href="/intro"
            className="rounded-lg px-2.5 py-1.5 font-medium text-indigo-100 hover:bg-[#252D6B] hover:text-white transition"
          >
            확장프로그램
          </Link>
          <Link
            href="/privacy"
            className="hidden sm:inline-block rounded-lg px-2.5 py-1.5 font-medium text-indigo-200 hover:bg-[#252D6B] hover:text-white transition"
          >
            개인정보처리방침
          </Link>
          <Link
            href="/intro#install"
            className="rounded-full bg-[#86B898] px-3.5 py-1.5 text-xs font-bold text-[#142038] hover:bg-[#9AC7AA] transition"
          >
            Chrome 추가
          </Link>
        </nav>
      </div>
    </header>
  );
}
