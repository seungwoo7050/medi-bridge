# MEDI BRIDGE (메디 브릿지)

네이버 지도에서 병·의원을 고르는 즉시 같은 지역의 모두닥 인증 리뷰와 공개 비급여 가격표를 상세 패널 위에 띄우고, 진료과에 맞는 타 미용·치과 플랫폼 검색으로 1클릭 연결해 주는 Chrome Extension(MV3) 모노레포 프로젝트입니다.

- **확장프로그램 안내 웹**: [medi-bridge.seungwoo7050.workers.dev](https://medi-bridge.seungwoo7050.workers.dev) (`/` 설치 안내·부가세 계산기 · `/privacy` 개인정보처리방침)

![메디 브릿지 Chrome 확장프로그램 안내 화면](./assets/preview.png)

---

## 왜 자체 비교 보드·시드 DB를 걷어내고 실시간 브릿지로 전환했는가

초기 버전에서는 자체 비교 웹(`/api/v1/*`)과 정적 12개 병원 시드 DB(`@medi-bridge/db`), 검색 목록 플로팅 드로어를 함께 두었습니다. 하지만 실제 네이버 지도(예: 분당 정자동 치과)에서 동작을 점검해 보니 두 가지 구조적 문제가 드러났습니다.

1. **시드 데이터와 실서비스 데이터의 괴리**: 수도권 일부 병원 중심의 정적 시드만으로는 전국 동네 병원 탐색을 감당할 수 없고, 카드 문구와 더미 링크가 실제 진료비 탐색 경험을 해칩니다.
2. **네이버 지도 `#searchIframe`·`/photo` 서브탭 매칭 누락**:
   - 목록 썸네일(`.place_thumb`)을 누르면 주소 DOM(`.pz7wy`)과 진료과 배지(`.mwWcl`)가 없고 상단 탭바(`.place_fixed_maintab`) 아래가 스크롤로 밀린 `/hospital/*/photo` 서브탭이 열립니다. 이때 `regionHint`가 빈 문자열로 떨어지면 서울 동명 병원이 대신 매칭되거나, 카드가 뷰포트 위쪽(`y < 0`) 또는 고정 탭바 뒤(`y: 57`)에 가려졌습니다.
   - 검색 목록의 스폰서 광고 행은 `.lHBM6` 진료과 배지 대신 휴게시간 배지만 달고 있어 목록 칩(`가격 비교 ↗`)이 아예 빠졌습니다.

이에 따라 `MEDI BRIDGE`는 자체 비교 웹과 시드 DB 패키지(`packages/db`)를 완전히 제거하고, **전국 어디서나 선택한 병원의 실제 지역·상호를 기준으로 동작하는 Chrome 확장프로그램 중심 구조**로 재설계했습니다.

---

## 주요 기능 및 아키텍처

### 1. Chrome Extension MV3 (`apps/extension`)
- **전국 실시간 모두닥 SSR 매칭 (`background.ts`, `modoodocParser.ts`)**: 병원을 열면 Service Worker가 모두닥 검색 페이지(`www.modoodoc.com/hospitals/query-search`)의 `__NEXT_DATA__` React Query(`dehydratedState`)를 파싱해 인증 리뷰 수·별점·시술 태그·특가/이벤트가/할인율(`formatPriceKRW`, `tabular-nums`)을 추출합니다.
- **크로스 프레임 지역 힌트 릴레이 (`REGISTER_SEARCH_REGION_HINTS`)**: `#searchIframe` 목록이 추출한 `시/구` 행정구역을 백그라운드 `searchRegionHints` 맵(최대 300건 FIFO)에 등록해 두고, 주소 DOM이 없는 `/photo` 상세 탭에서 요청이 들어오면 목록에서 확보한 지역 힌트를 이어 붙여 조회합니다.
- **서브탭(`isSubTab`) 앵커링 및 광고 행 Fallback (`naverEntryDom.ts`, `naverSearchListDom.ts`)**:
  - `/hospital/*/photo`·`/review` 등 서브탭에서는 `.place_fixed_maintab` 뒤의 빈 스페이서 요소 다음으로 앵커를 옮겨 고정 탭바 가림을 막고 `16px` 좌우 여백(`.mb-wrapper.is-subtab`)을 적용합니다.
  - 목록 광고 행에 `.lHBM6`이 없어도 `hospital` 컨텍스트가 확인되면 병원명 키워드를 함께 평가해 목록 칩을 붙입니다.
- **동명 분점 오매칭 및 부정 캐시 오염 차단**: `scoreNameMatch`의 느슨한 부분 문자열 일치를 제거해 접두 일치만 허용(80점)하고, 지역 힌트가 비어 있을 때는 90점 이상 완전·정규화 일치만 통과시키며 `parse_error` 및 지역 힌트 없는 `not_found`는 캐시에 저장하지 않습니다.
- **진료과 맞춤형 타 플랫폼 1클릭 검색 & 폴백 카드**: 피부과·성형외과는 `[강남언니, 여신티켓, 바비톡, 굿닥]`, 치과·안과는 `[강남언니, 굿닥]`, 그 외 진료과는 `[굿닥]` 검색 링크를 생성하며, 모두닥 직접 매칭이 없을 때도 깔끔한 폴백 카드를 띄워 다른 플랫폼에서 바로 찾아볼 수 있습니다.
- **목록 0-자동조회 & Popup 이력 관리**: 검색 목록을 여는 시점에는 외부 SSR 조회를 0건으로 유지하고, 상세 열람/칩 클릭 시에만 조회합니다. `chrome.storage.local` 갱신은 `enqueueWrite` FIFO 큐로 직렬화하고, 툴바 아이콘 활성/비활성 전환과 최근 본 병원(최대 20건) 관리 팝업을 제공합니다.

### 2. 확장프로그램 랜딩 및 개인정보처리방침 웹 (`apps/web`)
- **2페이지 정적 랜딩 (`/`, `/intro` 별칭, `/privacy`)**: Next.js 16 App Router 정적 빌드 + Cloudflare Workers(`env.ASSETS.fetch`, `RSC: 1` 404 폴백)로 운영되며 별도의 `/api/v1/*` 백엔드를 두지 않습니다.
- **부가세 10% 시뮬레이터 (`SavingsSimulator`)**: `@medi-bridge/shared`의 `computeEffectivePrice`로 부가세 별도 광고와 포함가의 실제 결제 순위 변화를 체험할 수 있습니다.
- **최소 권한 정책 (`/privacy`)**: 확장은 `storage` 권한만 사용하며 `host_permissions`는 `https://map.naver.com/*`, `https://pcmap.place.naver.com/*`, `https://www.modoodoc.com/*` 3개 도메인으로만 제한합니다(`localhost`·`workers.dev` 권한 0건).

---

## 모노레포 구조 (5개 워크스페이스)

```text
medi-bridge/
├── apps/
│   ├── extension/        # WXT + React 19 Chrome Extension MV3 (Shadow DOM UI, Background SW, Popup)
│   └── web/              # Next.js 16 정적 랜딩(/, /intro), 개인정보처리방침(/privacy), 부가세 시뮬레이터
├── packages/
│   ├── shared/           # Zod 스키마, VAT +10% 정규화, 표준 시술 키, 접두 병원 매칭 및 플랫폼 검색 URL 빌더
│   ├── parsers/          # 모두닥 SSR(__NEXT_DATA__) 파서 및 오프라인 HTML 픽스처 테스트
│   └── ui/               # Medical Bento 디자인 토큰(Deep Indigo / Sage Green / Slate) 및 SVG 배지
└── assets/               # README 프리뷰 이미지
```

---

## 로컬 실행, 엣지 배포 및 Chrome 웹스토어 패키징

사전 요구사항: Node.js 22+, `pnpm`

```bash
# 1. 의존성 설치
pnpm install

# 2. 전체 패키지 빌드 (확장프로그램 output/chrome-mv3 + 정적 Next.js 빌드)
pnpm build

# 3. Chrome 웹스토어 제출용 압축 아카이브 생성
pnpm zip:ext
```

Chrome에서 직접 로드해 확인하는 순서:

1. 주소창에서 `chrome://extensions` 로 이동해 우측 상단 **개발자 모드**를 켭니다.
2. **압축해제된 확장 프로그램을 로드합니다**를 클릭해 `apps/extension/output/chrome-mv3` 디렉터리를 선택합니다.
3. [네이버 지도](https://map.naver.com)에서 치과·안과·피부과·성형외과·정형외과를 검색하고 병원 상세/사진 탭 상단 Bento 카드와 목록 칩을 확인합니다.

```bash
# 안내 웹 로컬 개발 서버 (기본 http://localhost:3000)
pnpm dev:web

# Chrome Extension WXT 개발 모드
pnpm dev:ext

# Cloudflare Workers 정적 랜딩 배포
pnpm --filter @medi-bridge/web run deploy:cf
```

---

## 검증 명령어

```bash
# 전체 5개 워크스페이스 TypeScript 타입 체크 + Biome 린트/포맷 + Vitest 단위 테스트
pnpm verify

# 빌드된 Chrome Extension(크로스 프레임 지역 힌트 /photo E2E, Popup 토글) + 정적 웹 Playwright E2E
pnpm test:e2e
```
