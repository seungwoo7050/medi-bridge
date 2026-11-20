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
] as const;

test('소비자 랜딩(/), /intro 리다이렉트, /vat 시뮬레이터, /privacy 및 반응형을 검증한다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const header = page.locator('header');
  await expect(header.locator('img[alt="메디브릿지"]')).toBeVisible();
  await expect(header.getByText('부가세 계산기')).toHaveCount(0);

  await expect(page.getByRole('heading', { name: /지도 클릭 한 번으로 끝/ })).toBeVisible();
  await expect(page.getByText('분당 바른미소치과의원').first()).toBeVisible();

  await page.getByRole('tab', { name: '피부과' }).click();
  await expect(page.getByText('서초 고운빛피부과의원').first()).toBeVisible();
  for (const label of ['강남언니 ↗', '여신티켓 ↗', '바비톡 ↗', '굿닥 ↗']) {
    await expect(page.getByText(label)).toBeVisible();
  }

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

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/intro');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /지도 클릭 한 번으로 끝/ })).toBeVisible();

  await page.goto('/vat');
  await expect(
    page.getByRole('heading', { name: '참고용 부가세 10% 실결제가 계산기' }),
  ).toBeVisible();
  await expect(page.getByText('부가세 10% 포함 실결제가 시뮬레이터')).toBeVisible();
  await expect(page.getByText('모두닥 2,090,000원')).toBeVisible();
  await page.getByRole('switch').click();
  await expect(page.getByText('강남언니 (첫방문) 1,950,000원')).toBeVisible();

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: '메디 브릿지 개인정보처리방침' })).toBeVisible();
  await expect(page.getByText('https://www.modoodoc.com/*')).toBeVisible();
  await expect(page.getByText('별도의 자체 비교 백엔드 서버를 운영하지 않으며')).toBeVisible();
});
