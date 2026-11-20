import type { Metadata } from 'next';
import Link from 'next/link';
import type React from 'react';
import { SavingsSimulator } from '@/components/SavingsSimulator';

export const metadata: Metadata = {
  title: '참고용 부가세 10% 실결제가 계산기 | 메디브릿지',
  description:
    '비급여 시술 이벤트가에서 부가세 10% 포함 여부에 따라 실제 결제 금액 순위가 어떻게 달라지는지 미리 확인하는 참고용 계산기입니다.',
};

export default function VatCalculatorPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#1E2456] hover:underline"
        >
          <span>← 확장프로그램 소개로 돌아가기</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          참고용 부가세 10% 실결제가 계산기
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
          확장프로그램이 자동으로 긁어오는 기능은 아니며, 병원·플랫폼별로 ‘부가세 별도’ 이벤트가를
          볼 때 실제 결제 금액 순위가 어떻게 바뀌는지 미리 가늠해 보는 참고용 도구입니다.
        </p>
      </div>

      <SavingsSimulator />
    </div>
  );
}
