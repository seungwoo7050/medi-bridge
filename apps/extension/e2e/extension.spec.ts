import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { type BrowserContext, chromium, expect, test } from '@playwright/test';

const EXTENSION_PATH = resolve(import.meta.dirname, '../output/chrome-mv3');

const MODOODOC_DETAIL_SLUG = '강남케이안과의원-서울-역삼동';
const MODOODOC_DETAIL_URL = `https://www.modoodoc.com/hospital/86566/${encodeURIComponent(
  MODOODOC_DETAIL_SLUG,
)}`;

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
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        height: 100vh;
        display: flex;
      }
      iframe {
        border: 0;
        width: 420px;
        height: 100vh;
      }
    </style>
  </head>
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

test('네이버 지도 Medical Bento 비교 카드, VAT 실시간 재정렬, 반경 드로어 및 Popup 토글을 검증한다', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'medi-bridge-e2e-'));
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

    await context.route('https://www.modoodoc.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<html><body><h1>강남케이안과의원 상세</h1></body></html>',
      });
    });

    let [bgWorker] = context.serviceWorkers();
    if (!bgWorker) {
      bgWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    }

    // 백엔드 미기동 상태에서도 0건 목록 자동요청 규율 및 로컬 시드 폴백이 동작하도록 카운터 계측
    await bgWorker.evaluate(() => {
      const g = globalThis as typeof globalThis & { __boundsCalls?: number };
      g.__boundsCalls = 0;
      const origFetch = globalThis.fetch.bind(globalThis);
      globalThis.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/api/v1/hospitals/bounds')) {
          g.__boundsCalls = (g.__boundsCalls ?? 0) + 1;
        }
        if (url.includes('/api/v1/')) {
          return new Response(null, { status: 503 });
        }
        return origFetch(input, init);
      };
    });

    const mapPage = await context.newPage();
    await test.step('지도 페이지 이동 및 iframe 로드', async () => {
      await mapPage.goto('https://map.naver.com/p/search/test', {
        waitUntil: 'load',
      });

      await expect
        .poll(() => mapPage.frame({ name: 'searchIframe' }) !== null, { timeout: 5_000 })
        .toBe(true);
      await expect
        .poll(() => mapPage.frame({ name: 'entryIframe' }) !== null, { timeout: 5_000 })
        .toBe(true);
    });

    const searchFrame = mapPage.frame({ name: 'searchIframe' });
    const entryFrame = mapPage.frame({ name: 'entryIframe' });
    expect(searchFrame).not.toBeNull();
    expect(entryFrame).not.toBeNull();
    if (!searchFrame || !entryFrame) return;

    await test.step('1. 검색 목록 칩 마운트 및 자동 배치 호출 0건', async () => {
      const listChipLocator = searchFrame.locator('medi-bridge-list-chip');
      await expect(listChipLocator).toHaveCount(2, { timeout: 10_000 });
      await expect(
        searchFrame.locator('[data-testid="vet-hospital"] medi-bridge-list-chip'),
      ).toHaveCount(0);
      await expect(
        searchFrame.locator('[data-testid="cafe-place"] medi-bridge-list-chip'),
      ).toHaveCount(0);

      const initialBoundsCalls = await bgWorker.evaluate(() => {
        const g = globalThis as typeof globalThis & { __boundsCalls?: number };
        return g.__boundsCalls ?? 0;
      });
      expect(initialBoundsCalls).toBe(0);
    });

    await test.step('2. 상세 패널 Medical Bento 카드 및 VAT 토글 순위 전환', async () => {
      const entryCard = entryFrame.locator('medi-bridge-entry-card .mb-bento-card');
      await expect(entryCard).toBeVisible({ timeout: 10_000 });
      await expect(entryCard.locator('.mb-hira-price')).toContainText('350만원');

      const firstRowVatOn = entryCard.locator('.mb-offer-row').first();
      await expect(firstRowVatOn).toContainText('모두닥');
      await expect(firstRowVatOn).toContainText('209만원');

      const vatSwitch = entryCard.getByRole('switch', { name: 'VAT 포함 실질가 전환' });
      await expect(vatSwitch).toHaveAttribute('aria-checked', 'true');
      await vatSwitch.click();
      await expect(vatSwitch).toHaveAttribute('aria-checked', 'false');

      const firstRowVatOff = entryCard.locator('.mb-offer-row').first();
      await expect(firstRowVatOff).toContainText('강남언니');
      await expect(firstRowVatOff).toContainText('195만원');

      await vatSwitch.click();
      await expect(entryCard.locator('.mb-offer-row').first()).toContainText('모두닥');

      const ctaHref = await entryCard.locator('a.mb-primary-cta').getAttribute('href');
      expect(ctaHref).toBe(MODOODOC_DETAIL_URL);
    });

    await test.step('3. 반경 최저가 정렬 드로어 온디맨드 조회', async () => {
      const drawerTrigger = searchFrame.locator('medi-bridge-radius-drawer .mb-drawer-trigger');
      await expect(drawerTrigger).toContainText('현재 화면 병원 최저가 보드 (2곳)', {
        timeout: 5_000,
      });
      await drawerTrigger.click({ timeout: 5_000 });

      const drawerPanel = searchFrame.locator('medi-bridge-radius-drawer .mb-drawer-panel');
      await expect(drawerPanel).toBeVisible({ timeout: 5_000 });
      await expect(drawerPanel.locator('.mb-drawer-item')).toHaveCount(2, { timeout: 5_000 });
      await expect(drawerPanel.locator('.mb-drawer-name').first()).toContainText('지에스안과의원', {
        timeout: 5_000,
      });

      await drawerPanel.getByRole('tab', { name: '평점순' }).click({ timeout: 5_000 });
      await expect(drawerPanel.locator('.mb-drawer-name').first()).toContainText(
        '강남케이안과의원',
        { timeout: 5_000 },
      );
    });

    const extId = await test.step('3b. 확장 ID 추출', async () => {
      const workerHost = new URL(bgWorker.url()).host;
      return workerHost || resolveExtensionId(context);
    });
    const popupPage = await context.newPage();
    await test.step('4. Popup 비교함 및 ON/OFF 토글', async () => {
      await popupPage.goto(`chrome-extension://${extId}/popup.html`, {
        waitUntil: 'domcontentloaded',
      });

      await expect(popupPage.locator('.history-name')).toContainText(['강남케이안과의원']);

      const overlaySwitch = popupPage.getByRole('switch', {
        name: '네이버 지도 내 메디 브릿지 자동 표시',
      });
      await expect(overlaySwitch).toHaveAttribute('aria-checked', 'true');
      await overlaySwitch.click();
      await expect(overlaySwitch).toHaveAttribute('aria-checked', 'false');

      await expect(entryFrame.locator('medi-bridge-entry-card')).toHaveCount(0, { timeout: 5_000 });
      await expect(searchFrame.locator('medi-bridge-list-chip')).toHaveCount(0, { timeout: 5_000 });
      await expect(searchFrame.locator('medi-bridge-radius-drawer')).toHaveCount(0, {
        timeout: 5_000,
      });

      await overlaySwitch.click();
      await expect(entryFrame.locator('medi-bridge-entry-card .mb-bento-card')).toHaveCount(1, {
        timeout: 5_000,
      });
      await expect(searchFrame.locator('medi-bridge-list-chip')).toHaveCount(2, { timeout: 5_000 });
    });

    await test.step('5. 상세 CTA 클릭 시 새 탭 및 방문 상태 기록', async () => {
      const [newTab] = await Promise.all([
        context.waitForEvent('page', { timeout: 10_000 }),
        entryFrame.locator('medi-bridge-entry-card a.mb-primary-cta').click(),
      ]);
      await newTab.waitForLoadState('domcontentloaded');
      expect(newTab.url()).toBe(MODOODOC_DETAIL_URL);

      await expect(popupPage.locator('.visited-pill').first()).toContainText('상세 열람함');

      const organicChip = searchFrame.locator(
        '[data-testid="organic-hospital"] medi-bridge-list-chip a.mb-list-chip',
      );
      await expect(organicChip).toHaveClass(/is-visited/, { timeout: 5_000 });
    });
  } finally {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
