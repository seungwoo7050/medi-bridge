import { expect, test } from '@playwright/test';

test('자체 비교 웹(/, /hospitals/[slug]), 홍보 랜딩 시뮬레이터(/intro), 정책(/privacy) 및 API를 검증한다', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /VAT 별도 낚시 없이, 진짜 결제 금액으로 병원 비교/ }),
  ).toBeVisible();

  await page.getByRole('button', { name: '피부과', exact: true }).click();
  await expect(page.getByText('연세봄피부과의원').first()).toBeVisible();

  await page.goto('/hospitals/gangnam-k-eye');
  await expect(page.getByRole('heading', { name: '강남케이안과의원' })).toBeVisible();
  await expect(page.getByText('모두닥').first()).toBeVisible();

  const detailVatSwitch = page.getByRole('switch');
  await detailVatSwitch.click();
  await expect(detailVatSwitch).toHaveAttribute('aria-checked', 'false');

  await page.goto('/intro');
  await expect(page.getByText('내 동네 시술가 거품 빼기 시뮬레이터')).toBeVisible();
  await expect(page.getByText('모두닥 209만원')).toBeVisible();
  await page.getByRole('switch').click();
  await expect(page.getByText('강남언니 (첫방문) 195만원')).toBeVisible();

  await page.goto('/privacy');
  await expect(page.getByText('MEDI BRIDGE (메디 브릿지) 개인정보처리방침')).toBeVisible();

  const boundsRes = await request.post('/api/v1/hospitals/bounds', {
    data: {
      clinics: [
        { name: '강남케이안과의원', regionHint: '서울 강남구', department: '안과' },
        { name: '더바른치과의원', regionHint: '서울 강남구', department: '치과' },
      ],
      includeVat: true,
      sortBy: 'lowest_price',
    },
  });
  expect(boundsRes.ok()).toBe(true);
  const boundsJson = await boundsRes.json();
  expect(boundsJson.matchedCount).toBe(2);
});
