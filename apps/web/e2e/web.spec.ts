import { expect, test } from '@playwright/test';

test('확장프로그램 랜딩(/, /intro), 부가세 시뮬레이터, 개인정보처리방침(/privacy)을 검증한다', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /전국 병원 비급여 가격·리뷰 확인/ }),
  ).toBeVisible();
  await expect(page.getByText('드라마치과병원')).toBeVisible();
  await expect(page.getByText('강남언니 ↗')).toBeVisible();
  await expect(page.getByText('내장 좌표 핀 뷰어')).toHaveCount(0);
  await expect(page.getByText('심평원 대조')).toHaveCount(0);

  await expect(page.getByText('부가세 별도 낚시 계산 시뮬레이터')).toBeVisible();
  await expect(page.getByText('모두닥 2,090,000원')).toBeVisible();
  await page.getByRole('switch').click();
  await expect(page.getByText('강남언니 (첫방문) 1,950,000원')).toBeVisible();

  await page.goto('/intro');
  await expect(
    page.getByRole('heading', { name: /전국 병원 비급여 가격·리뷰 확인/ }),
  ).toBeVisible();

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: '메디 브릿지 개인정보처리방침' })).toBeVisible();
  await expect(page.getByText('https://www.modoodoc.com/*')).toBeVisible();
  await expect(page.getByText('별도의 자체 비교 백엔드 서버를 운영하지 않으며')).toBeVisible();
});
