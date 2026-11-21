import { expect, test } from '@playwright/test';

const FORBIDDEN_LANDING_TERMS = [
  '드라마치과병원',
  '내장 좌표 핀 뷰어',
  '심평원 대조',
  '주소 DOM',
  '목록 프레임',
  '미등록 캐시',
  '앞글자 접두 일치',
  'seungwoo7050',
  '정규화',
  '기준선',
  '대조',
  '내장',
  '뷰어',
  '좌표',
  '병원비 손품',
  '지도 밖으로 나가지 않습니다',
  '흐름을 끊지 않고',
] as const;

test('소비자 랜딩(/), 실제 네이버 지도 캡처, 링크/ZIP 다운로드, /vat, /privacy 및 반응형을 검증한다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const header = page.locator('header');
  await expect(header.locator('img[alt="메디브릿지"]')).toBeVisible();
  await expect(header.getByText('부가세 계산기')).toHaveCount(0);

  await expect(
    page.getByRole('heading', { name: /이 병원 시술비,\s*앱마다 왜 다를까요\?/ }),
  ).toBeVisible();

  await expect(page.locator('main [class*="rounded-full"]')).toHaveCount(0);

  // 실제 네이버 지도 및 확장프로그램 팝업 캡처 4종 로드 검증
  for (const imgName of [
    'hero-drawer-closeup.png',
    'naver-drawer.png',
    'showcase-detail-panel.png',
    'showcase-popup.png',
  ]) {
    const img = page.locator(`img[src*="${imgName}"]`);
    await expect(img).toBeVisible();
    await img.scrollIntoViewIfNeeded();
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(
      true,
    );
  }

  // 체험 패키지 ZIP 직접 다운로드 응답 검증 (빈 Releases 대신 정적 ZIP 제공)
  const zipHref = await page
    .getByRole('link', { name: /체험 패키지 ZIP 내려받기/ })
    .getAttribute('href');
  expect(zipHref).toBe('/downloads/medi-bridge-chrome-mv3.zip');
  const zipRes = await page.request.get('/downloads/medi-bridge-chrome-mv3.zip');
  expect(zipRes.status()).toBe(200);
  const zipBytes = await zipRes.body();
  expect(zipBytes.byteLength).toBeGreaterThan(10_000);
  expect(zipBytes.subarray(0, 2).toString('ascii')).toBe('PK');

  for (const term of FORBIDDEN_LANDING_TERMS) {
    await expect(page.getByText(term)).toHaveCount(0);
  }

  await expect(page.getByText(/공식 제휴·운영 관계가 없는 독립 서드파티/)).toBeVisible();

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow).toBe(false);
  }

  await expect(
    page.locator('div.fixed').getByRole('button', { name: 'PC 설치용 링크 복사' }),
  ).toBeVisible();

  // 실제 링크 클릭 이동 및 복귀 검증 (/ -> /vat -> /)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('link', { name: '별도 계산기 열기 →' }).click();
  await expect(page).toHaveURL(/\/vat$/);
  await expect(
    page.getByRole('heading', { name: '참고용 부가세 10% 실결제가 계산기' }),
  ).toBeVisible();
  await expect(page.getByText('부가세 10% 포함 실결제가 시뮬레이터')).toBeVisible();
  await expect(page.getByText('모두닥 2,090,000원')).toBeVisible();
  await page.getByRole('switch').click();
  await expect(page.getByText('강남언니 (첫방문) 1,950,000원')).toBeVisible();

  await page.getByRole('link', { name: '← 확장프로그램 소개로 돌아가기' }).click();
  await expect(page).toHaveURL(/\/$/);

  // 실제 링크 클릭 이동 및 복귀 검증 (/ -> /privacy -> /)
  await page.getByRole('link', { name: '개인정보처리방침 전문 →' }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: '메디 브릿지 개인정보처리방침' })).toBeVisible();
  await expect(page.getByText('https://www.modoodoc.com/*')).toBeVisible();
  await expect(page.getByText('https://unni.app/*')).toBeVisible();
  await expect(page.getByText('https://api.yeoshin.co.kr/*')).toBeVisible();
  await expect(page.getByText('https://web-api.babitalk.com/*')).toBeVisible();
  await expect(page.getByText('별도의 자체 비교 백엔드 서버를 운영하지 않으며')).toBeVisible();

  await page.getByRole('link', { name: '← 확장프로그램 소개로 돌아가기' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/intro');
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { name: /이 병원 시술비,\s*앱마다 왜 다를까요\?/ }),
  ).toBeVisible();
});
