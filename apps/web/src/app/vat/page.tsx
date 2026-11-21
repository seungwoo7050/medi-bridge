import type { Metadata } from 'next';
import type React from 'react';
import { SavingsSimulator } from '@/components/SavingsSimulator';

export const metadata: Metadata = {
  title: '참고용 부가세 10% 실결제가 계산기 | 메디브릿지',
  description:
    '비급여 시술 이벤트가에서 부가세 10% 포함 여부에 따라 실제 결제 금액 순위가 어떻게 달라지는지 미리 확인하는 참고용 계산기입니다.',
};

export default function VatCalculatorPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 pb-16 space-y-6">
      <div className="space-y-2">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E2456] hover:underline"
        >
          <span>← 확장프로그램 소개로 돌아가기</span>
        </a>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          참고용 부가세 10% 실결제가 계산기
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
          부가세 별도 표기에 10%를 더했을 때 플랫폼별 최저가 순위가 어떻게 바뀌는지 계산합니다.
        </p>
      </div>

      <SavingsSimulator />
    </div>
  );
}
