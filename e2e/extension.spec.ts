import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { type BrowserContext, chromium, expect, test } from '@playwright/test';

const EXTENSION_PATH = resolve(import.meta.dirname, '../.output/chrome-mv3');

const SEARCH_IFRAME_HTML = `<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8" /></head>
  <body>
    <div id="_pcmap_list_scroll_container">
      <ul>
        <li class="DWs4Q z23xh" data-testid="ad-hospital">
          <div class="IPtqD">
            <div class="uMPdj">
              <a href="#" class="uD1F4 gADnZ" data-nlog-params='{"item_type":"place_type","item_name":"hospital"}'>
                <span class="q2LdB">지에스안과의원</span>
              </a>
            </div>
            <div class="_XGt_"><span class="suKMR">서울 강남구 역삼동</span></div>
            <div class="wt0BA"><span class="D1dXu">전문의</span><span class="D1dXu">안과 7명</span></div>
          </div>
        </li>
        <li class="DWs4Q z23xh" data-testid="organic-hospital">
          <div class="IPtqD">
            <div class="uMPdj">
              <a href="#" class="uD1F4 gADnZ">
                <span class="q2LdB">강남케이안과의원</span>
                <span class="lHBM6">안과</span>
              </a>
            </div>
            <div class="_XGt_"><span class="suKMR">서울 강남구 역삼동</span></div>
          </div>
        </li>
        <li class="DWs4Q z23xh" data-testid="vet-hospital">
          <div class="IPtqD">
            <div class="uMPdj">
              <a href="#" class="uD1F4 gADnZ">
                <span class="q2LdB">24시센트럴동물병원</span>
                <span class="lHBM6">동물병원</span>
              </a>
            </div>
            <div class="_XGt_"><span class="suKMR">서울 강남구 논현동</span></div>
          </div>
        </li>
        <li class="DWs4Q z23xh" data-testid="cafe-place">
          <div class="IPtqD">
            <div class="uMPdj">
              <a href="#" class="uD1F4 gADnZ">
                <span class="q2LdB">스타벅스 강남역점</span>
                <span class="lHBM6">카페,디저트</span>
              </a>
            </div>
            <div class="_XGt_"><span class="suKMR">서울 서초구 서초동</span></div>
          </div>
        </li>
      </ul>
    </div>
  </body>
</html>`;

const ENTRY_IFRAME_HTML = `<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8" /></head>
  <body>
    <div role="main">
      <div class="place_section no_margin OP4V8 xtZml" data-nclicks-area-code="btp">
        <div class="WmLT9"><span class="PbnXW">강남케이안과의원</span></div>
        <div>
          <div class="HzrWS">
            <span class="mwWcl">안과</span>
            <span class="mwWcl"><a href="/hospital/1399571178/review/visitor">리뷰 307</a></span>
          </div>
        </div>
      </div>
      <div class="place_section no_margin">
        <div class="O8qbU tQY7D">
          <div class="vV_z_">
            <span class="pz7wy">서울 강남구 강남대로 374 13층</span>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;

const PARENT_MAP_HTML = `<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8" /></head>
  <body>
    <iframe id="searchIframe" name="searchIframe" src="https://pcmap.place.naver.com/hospital/list?query=test"></iframe>
    <iframe id="entryIframe" name="entryIframe" src="https://pcmap.place.naver.com/hospital/1399571178/home"></iframe>
  </body>
</html>`;

async function resolveExtensionId(context: BrowserContext): Promise<string> {
  const page = await context.newPage();
  await page.goto('chrome://extensions/', { waitUntil: 'domcontentloaded' });
  const extId = await page.evaluate(() => {
    const manager = document.querySelector('extensions-manager');
    const itemList = manager?.shadowRoot?.querySelector('extensions-item-list');
    const item = itemList?.shadowRoot?.querySelector('extensions-item');
    return item?.getAttribute('id') ?? '';
  });
  await page.close();
  if (!extId) {
    throw new Error('Failed to resolve loaded Chrome extension ID');
  }
  return extId;
}

test('네이버 지도 이중 프레임 배지·미니 칩 마운트, Popup 히스토리 및 실시간 토글 동작을 검증한다', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'modoodoc-e2e-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
  });

  try {
    await context.route('https://map.naver.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: PARENT_MAP_HTML,
      });
    });

    await context.route('https://pcmap.place.naver.com/**', async (route) => {
      const url = route.request().url();
      const body = url.includes('/list') ? SEARCH_IFRAME_HTML : ENTRY_IFRAME_HTML;
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body,
      });
    });

    const mapPage = await context.newPage();
    await mapPage.goto('https://map.naver.com/p/search/test', {
      waitUntil: 'load',
    });

    await expect
      .poll(() => mapPage.frame({ name: 'searchIframe' }) !== null, {
        timeout: 5_000,
      })
      .toBe(true);
    await expect
      .poll(() => mapPage.frame({ name: 'entryIframe' }) !== null, {
        timeout: 5_000,
      })
      .toBe(true);

    const searchFrame = mapPage.frame({ name: 'searchIframe' });
    const entryFrame = mapPage.frame({ name: 'entryIframe' });
    expect(searchFrame).not.toBeNull();
    expect(entryFrame).not.toBeNull();

    if (!searchFrame || !entryFrame) {
      return;
    }

    // 1. 검색 목록: 병원 2건(광고+일반)에만 미니 칩 마운트, 동물병원·카페는 미노출
    const listChipLocator = searchFrame.locator('modoodoc-naver-list-chip');
    await expect(listChipLocator).toHaveCount(2, { timeout: 10_000 });
    await expect(
      searchFrame.locator('[data-testid="vet-hospital"] modoodoc-naver-list-chip'),
    ).toHaveCount(0);
    await expect(
      searchFrame.locator('[data-testid="cafe-place"] modoodoc-naver-list-chip'),
    ).toHaveCount(0);

    // 2. 상세 패널: 퍼플 배지 마운트 및 정확한 모두닥 검색 URL 확인
    const entryBadgeHost = entryFrame.locator('modoodoc-naver-bridge');
    await expect(entryBadgeHost).toHaveCount(1, { timeout: 10_000 });

    const badgeHref = await entryBadgeHost.evaluate((host) => {
      const link = host.shadowRoot?.querySelector('a.modoodoc-bridge-badge');
      return link?.getAttribute('href') ?? '';
    });
    const parsedUrl = new URL(badgeHref);
    expect(parsedUrl.origin + parsedUrl.pathname).toBe(
      'https://www.modoodoc.com/hospitals/query-search',
    );
    expect(parsedUrl.searchParams.get('search_query')).toBe('서울 강남구 강남케이안과의원');

    // 3. Popup에서 최근 본 병원 기록 확인 및 토글 OFF 시 실시간 제거 검증
    const extId = await resolveExtensionId(context);
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extId}/popup.html`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(popupPage.locator('.history-name')).toContainText(['강남케이안과의원']);

    const toggleSwitch = popupPage.getByRole('switch');
    await expect(toggleSwitch).toHaveAttribute('aria-checked', 'true');
    await toggleSwitch.click();
    await expect(toggleSwitch).toHaveAttribute('aria-checked', 'false');

    // 새로고침 없이 열린 네이버 지도 탭의 배지와 미니 칩이 즉시 제거되어야 함
    await expect(entryFrame.locator('modoodoc-naver-bridge')).toHaveCount(0, {
      timeout: 5_000,
    });
    await expect(searchFrame.locator('modoodoc-naver-list-chip')).toHaveCount(0, {
      timeout: 5_000,
    });

    // 다시 켜면 즉시 재마운트
    await toggleSwitch.click();
    await expect(entryFrame.locator('modoodoc-naver-bridge')).toHaveCount(1, {
      timeout: 5_000,
    });
    await expect(searchFrame.locator('modoodoc-naver-list-chip')).toHaveCount(2, {
      timeout: 5_000,
    });

    // 배지 클릭 시 팝업 히스토리에 '리뷰 확인함' 상태 반영 확인
    await context.route('https://www.modoodoc.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<html><body><h1>모두닥</h1></body></html>',
      });
    });
    const [newTab] = await Promise.all([
      context.waitForEvent('page'),
      entryFrame.locator('modoodoc-naver-bridge a.modoodoc-bridge-badge').click(),
    ]);
    await newTab.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.reviewed-pill')).toContainText(['리뷰 확인함']);
  } finally {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
