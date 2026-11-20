import { BrandInfinityIcon } from '@medi-bridge/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import type React from 'react';
import { MobileCopyLinkBar } from '@/components/MobileCopyLinkBar';
import { SiteHeader } from '@/components/SiteHeader';
import { SITE_URL } from '@/lib/siteConfig';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  title: '메디브릿지 | 네이버 지도 병원 비급여 가격·리뷰 확장프로그램',
  description:
    '병원 이름을 복사해 여러 앱을 뒤질 필요 없이, 네이버 지도에서 병원을 클릭하면 모두닥 인증 리뷰와 비급여 가격표를 바로 띄워 주는 Chrome 확장프로그램입니다.',
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white mt-14">
          <div className="mx-auto max-w-5xl px-4 pt-8 pb-24 md:pb-10 space-y-5 text-xs text-slate-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <BrandInfinityIcon size={20} className="text-[#1E2456] shrink-0" />
                  <p className="font-bold text-slate-900">메디브릿지</p>
                </div>
                <p className="break-keep">
                  네이버 지도에서 병원 비급여 가격과 모두닥 인증 리뷰를 바로 확인하는 Chrome
                  확장프로그램입니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-5 shrink-0 whitespace-nowrap">
                <Link href="/" className="hover:text-[#1E2456] font-medium">
                  확장프로그램 소개
                </Link>
                <Link href="/vat" className="hover:text-[#1E2456] font-medium">
                  참고용 부가세 계산기
                </Link>
                <Link href="/privacy" className="hover:text-[#1E2456] font-medium">
                  개인정보처리방침
                </Link>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-400 break-keep">
              본 서비스는 네이버, 모두닥, 강남언니, 여신티켓, 바비톡, 굿닥 등 언급된 플랫폼과 공식
              제휴·운영 관계가 없는 독립 서드파티 브라우저 확장프로그램입니다.
            </div>
          </div>
        </footer>
        <MobileCopyLinkBar />
      </body>
    </html>
  );
}
