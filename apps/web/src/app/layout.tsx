import type { Metadata } from 'next';
import type React from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: '메디 브릿지 | 병원 시술 실결제가 비교',
  description:
    '병원 앱마다 숨겨둔 부가세(10%)를 더해 스마일라식, 임플란트, 인모드 실제 결제 금액을 비교합니다.',
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
            <div>
              <p className="font-semibold text-slate-800">메디 브릿지</p>
              <p className="mt-1">
                건강보험심사평가원 비급여 공개 가격과 주요 예약 앱의 이벤트가에 부가세(10%)를 반영해
                실제 결제 금액을 안내합니다.
              </p>
            </div>
            <div className="flex items-center gap-5 shrink-0">
              <a href="/" className="hover:text-[#1E2456] font-medium">
                가격 비교
              </a>
              <a href="/intro" className="hover:text-[#1E2456] font-medium">
                크롬 확장프로그램
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
