import { expect, test } from '@playwright/test';

test('자체 비교 웹(/, /hospitals/[slug]), 홍보 랜딩 시뮬레이터(/intro), 정책(/privacy) 및 API를 검증한다', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /시술별 병원 실결제가 비교/ })).toBeVisible();
  await expect(page.getByText('강남케이안과의원').first()).toBeVisible();
  await expect(page.getByText('2,090,000원').first()).toBeVisible();
  await expect(page.getByText('내장 좌표 핀 뷰어')).toHaveCount(0);
  await expect(page.getByText('심평원 대조')).toHaveCount(0);

  await page.getByRole('button', { name: '치과', exact: true }).click();
  await expect(page.getByText('하루플란트치과의원').first()).toBeVisible();
  await expect(page.getByText('690,000원').first()).toBeVisible();
  await expect(page.getByText('45,000원')).toHaveCount(0);

  await page.goto('/hospitals/gangnam-k-eye');
  await expect(page.getByRole('heading', { name: '강남케이안과의원' })).toBeVisible();
  await expect(page.getByText('모두닥').first()).toBeVisible();
  await expect(page.getByText('2,090,000원').first()).toBeVisible();

  const detailVatSwitch = page.getByRole('switch');
  await detailVatSwitch.click();
  await expect(detailVatSwitch).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByText('1,950,000원').first()).toBeVisible();

  await page.goto('/intro');
  await expect(page.getByText('부가세 별도 낚시 계산 시뮬레이터')).toBeVisible();
  await expect(page.getByText('모두닥 2,090,000원')).toBeVisible();
  await page.getByRole('switch').click();
  await expect(page.getByText('강남언니 (첫방문) 1,950,000원')).toBeVisible();

  await page.goto('/privacy');
  await expect(page.getByText('메디 브릿지 개인정보처리방침')).toBeVisible();

  const boundsRes = await request.post('/api/v1/hospitals/bounds', {
    data: {
      clinics: [
        { name: '강남케이안과의원', regionHint: '서울 강남구', department: '안과' },
        { name: '하루플란트치과의원', regionHint: '서울 서초구', department: '치과' },
      ],
      includeVat: true,
      sortBy: 'lowest_price',
    },
  });
  expect(boundsRes.ok()).toBe(true);
  const boundsJson = await boundsRes.json();
  expect(boundsJson.matchedCount).toBe(2);
});
