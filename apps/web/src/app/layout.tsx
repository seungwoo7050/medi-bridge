import { BrandInfinityIcon } from '@medi-bridge/ui';
import type { Metadata } from 'next';
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
  title: '메디브릿지 | 네이버 지도 병원 비급여 최저가 비교 확장프로그램',
  description:
    '네이버 지도에서 병원을 고르면 모두닥·강남언니·여신티켓·바비톡 이벤트가와 병원 신고 정가를 모아 부가세 10% 포함 최저가순으로 비교하는 Chrome 확장프로그램입니다.',
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col bg-white text-slate-900">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 bg-[#0B0F24] text-slate-400">
          <div className="mx-auto max-w-5xl px-4 pt-9 pb-24 md:pb-11 space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <BrandInfinityIcon size={20} className="text-[#86B898] shrink-0" />
                  <p className="font-bold text-white">메디브릿지</p>
                </div>
                <p className="text-slate-400 break-keep">
                  네이버 지도에서 여러 플랫폼의 비급여 가격을 모아 부가세 포함 최저가순으로 비교하는
                  Chrome 확장프로그램입니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-5 shrink-0 whitespace-nowrap">
                <a href="/" className="text-slate-300 hover:text-white font-medium transition">
                  확장프로그램 소개
                </a>
                <a href="/vat" className="text-slate-300 hover:text-white font-medium transition">
                  참고용 부가세 계산기
                </a>
                <a
                  href="/privacy"
                  className="text-slate-300 hover:text-white font-medium transition"
                >
                  개인정보처리방침
                </a>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 text-[11px] leading-relaxed text-slate-400 break-keep">
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
