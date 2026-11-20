import type { Metadata } from 'next';
import type React from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: '메디 브릿지 | 네이버 지도 병원 가격·리뷰 확장프로그램',
  description:
    '네이버 지도에서 병원을 고르는 즉시 같은 지역의 모두닥 인증 리뷰와 비급여 가격표, 타 플랫폼 검색 링크를 한 화면에서 확인하는 Chrome 확장프로그램입니다.',
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
          <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
            <div className="space-y-1">
              <p className="font-semibold text-slate-800">메디 브릿지</p>
              <p className="break-keep">
                네이버 지도 위에서 전국 병원의 모두닥 비급여 가격·인증 리뷰와 주요 미용·치과 플랫폼
                검색을 연결하는 Chrome 확장프로그램입니다.
              </p>
            </div>
            <div className="flex items-center gap-5 shrink-0 whitespace-nowrap">
              <a href="/" className="hover:text-[#1E2456] font-medium">
                확장프로그램 안내
              </a>
              <a href="/#simulator" className="hover:text-[#1E2456] font-medium">
                부가세 계산기
              </a>
              <a href="/privacy" className="hover:text-[#1E2456] font-medium">
                개인정보처리방침
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
