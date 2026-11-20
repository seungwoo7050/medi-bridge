import type React from 'react';

export default function PrivacyPolicyPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-5">
        <h1 className="text-2xl font-bold text-slate-900">메디 브릿지 개인정보처리방침</h1>
        <p className="text-xs text-slate-500">시행일: 2026년 11월 20일</p>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed break-keep">
          <h2 className="text-base font-bold text-slate-900">1. 수집하지 않는 정보</h2>
          <p>
            메디 브릿지 Chrome 확장프로그램 및 안내 웹은 사용자의 회원가입, 로그인 세션 쿠키, 개인
            진료 기록, 결제 정보, 브라우징 전체 이력을 수집하거나 외부 서버로 전송하지 않습니다.
          </p>
        </section>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed break-keep">
          <h2 className="text-base font-bold text-slate-900">
            2. 확장프로그램 최소 권한 및 로컬 저장소
          </h2>
          <p>
            확장프로그램은 최소 권한 원칙에 따라 <code>storage</code> 권한만을 사용합니다. 사용자가
            직접 설정한 배지 ON/OFF 상태, 최근 확인한 병원 최대 20건, 공개 가격·리뷰 요약 캐시(일치
            결과 24시간 / 지역 확인된 미일치 30분)는 사용자 브라우저의{' '}
            <code>chrome.storage.local</code> 내부에만 저장됩니다.
          </p>
        </section>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed break-keep">
          <h2 className="text-base font-bold text-slate-900">
            3. 허용 호스트(3개 도메인) 및 실시간 조회 방식
          </h2>
          <p>
            확장프로그램의 호스트 접근 범위는 <code>https://map.naver.com/*</code>,{' '}
            <code>https://pcmap.place.naver.com/*</code>, <code>https://www.modoodoc.com/*</code>{' '}
            3개 도메인으로만 제한됩니다. 별도의 자체 비교 백엔드 서버를 운영하지 않으며, 사용자가
            네이버 지도에서 선택한 병원의 상호명·행정구역 힌트만을 이용해 모두닥 공개 검색
            페이지에서 비급여 가격·리뷰 요약을 실시간 조회합니다.
          </p>
        </section>
      </div>
    </div>
  );
}
