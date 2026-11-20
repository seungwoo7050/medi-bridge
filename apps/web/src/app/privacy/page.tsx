import type React from 'react';

export default function PrivacyPolicyPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-5">
        <h1 className="text-2xl font-bold text-slate-900">메디 브릿지 개인정보처리방침</h1>
        <p className="text-xs text-slate-500">시행일: 2026년 11월 19일</p>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">1. 수집하지 않는 정보</h2>
          <p>
            메디 브릿지 Chrome 확장프로그램 및 웹 서비스는 사용자의 회원가입, 로그인 세션 쿠키, 개인
            진료 기록, 결제 정보, 브라우징 전체 이력을 수집하거나 외부 서버로 전송하지 않습니다.
          </p>
        </section>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">
            2. 확장프로그램 권한 및 로컬 저장소
          </h2>
          <p>
            확장프로그램은 최소 권한 원칙에 따라 <code>storage</code> 권한만을 사용합니다. 사용자가
            직접 설정한 배지 표시 여부, 부가세 포함 기본값, 최근 확인한 병원 최대 20건 및 공개 가격
            요약 TTL 캐시는 사용자 브라우저의 <code>chrome.storage.local</code> 내부에만 보관됩니다.
          </p>
        </section>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">3. 공개 비급여·이벤트 데이터 조회</h2>
          <p>
            네이버 지도 상세 패널을 열거나 사용자가 주변 최저가 보드를 직접 실행할 때, 해당 병원의
            상호명·행정구역 힌트만을 비교 API로 조회해 공개 가격표를 함께 표시합니다.
          </p>
        </section>
      </div>
    </div>
  );
}
