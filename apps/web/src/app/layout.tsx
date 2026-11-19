import type { Metadata } from 'next';
import type React from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: 'MEDI BRIDGE 메디 브릿지 | 비급여·이벤트 의료 가격 통합 비교',
  description:
    '심평원 비급여 정가와 모두닥·강남언니·여신티켓·바비톡·굿닥 이벤트 가격을 VAT 포함 실질가 기준으로 한눈에 대조합니다.',
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white mt-14">
          <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-800">MEDI BRIDGE (메디 브릿지)</p>
              <p className="mt-1">
                심평원 비급여 진료비용 신고 기준선과 주요 의료 플랫폼 공개 이벤트가를 정규화해
                대조합니다.
              </p>
            </div>
            <div className="flex items-center gap-5">
              <a href="/" className="hover:text-[#1E2456] font-medium">
                가격 비교 탐색
              </a>
              <a href="/intro" className="hover:text-[#1E2456] font-medium">
                확장프로그램 소개
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
