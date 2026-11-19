import { SeedComparisonRepository } from '@medi-bridge/db/seed';
import {
  BoundsComparisonRequestSchema,
  BoundsComparisonResponseSchema,
  type HospitalComparisonSummary,
  MatchHospitalResponseSchema,
} from '@medi-bridge/shared';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { parseModoodocSearchResult } from '../adapters/modoodocSearchParser';
import {
  attachComparisonToRecentHospital,
  attachSummaryToRecentHospital,
  getBridgeState,
  getCachedHospitalComparison,
  getCachedHospitalSummary,
  markHospitalClicked,
  setCachedHospitalComparison,
  setCachedHospitalSummary,
  subscribeBridgeEnabled,
} from '../domain/bridgeStorage';
import { applyHistoryMutation } from '../domain/historyGateway';
import {
  buildHospitalKey,
  buildModoodocSearchUrl,
  extractRegionHintFromAddress,
  normalizeHospitalName,
} from '../domain/modoodocUrl';
import { API_BASE_URL } from '../domain/serviceUrls';
import type {
  CompareBoundsClinicsRequest,
  CompareBoundsClinicsResponse,
  FetchHospitalComparisonRequest,
  FetchHospitalComparisonResponse,
  FetchModoodocSummaryRequest,
  FetchModoodocSummaryResponse,
  HistoryMutation,
  ModoodocHospitalSummary,
  MutateHistoryRequest,
  OpenModoodocHospitalRequest,
  OpenModoodocHospitalResponse,
} from '../types/place';

const seedRepo = new SeedComparisonRepository();

const ACTIVE_ICON_PATHS = {
  16: 'icon/active-16.png',
  32: 'icon/active-32.png',
  48: 'icon/active-48.png',
  128: 'icon/active-128.png',
} as const;

const INACTIVE_ICON_PATHS = {
  16: 'icon/inactive-16.png',
  32: 'icon/inactive-32.png',
  48: 'icon/inactive-48.png',
  128: 'icon/inactive-128.png',
} as const;

async function syncToolbarActionIcon(enabled: boolean): Promise<void> {
  try {
    await browser.action?.setIcon({
      path: enabled ? ACTIVE_ICON_PATHS : INACTIVE_ICON_PATHS,
    });
  } catch {
    // 테스트·헤드리스 환경에서 action API 미지원 시 무시
  }
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFetchModoodocSummaryRequest(value: unknown): value is FetchModoodocSummaryRequest {
  return (
    isRecordObject(value) &&
    value.type === 'FETCH_MODOODOC_SUMMARY' &&
    typeof value.hospitalName === 'string' &&
    typeof value.regionHint === 'string' &&
    typeof value.department === 'string'
  );
}

function isFetchHospitalComparisonRequest(value: unknown): value is FetchHospitalComparisonRequest {
  return (
    isRecordObject(value) &&
    value.type === 'FETCH_HOSPITAL_COMPARISON' &&
    typeof value.hospitalName === 'string' &&
    typeof value.regionHint === 'string' &&
    typeof value.department === 'string'
  );
}

function isCompareBoundsClinicsRequest(value: unknown): value is CompareBoundsClinicsRequest {
  if (!isRecordObject(value) || value.type !== 'COMPARE_BOUNDS_CLINICS') {
    return false;
  }
  const parsed = BoundsComparisonRequestSchema.safeParse({
    clinics: value.clinics,
    department: value.department,
    includeVat: value.includeVat,
    sortBy: value.sortBy,
  });
  return parsed.success;
}

function isOpenModoodocHospitalRequest(value: unknown): value is OpenModoodocHospitalRequest {
  return (
    isRecordObject(value) &&
    value.type === 'OPEN_MODOODOC_HOSPITAL' &&
    typeof value.hospitalName === 'string' &&
    typeof value.regionHint === 'string' &&
    typeof value.department === 'string'
  );
}

function isHistoryMutation(value: unknown): value is HistoryMutation {
  if (!isRecordObject(value)) {
    return false;
  }
  switch (value.op) {
    case 'view':
    case 'click':
      return (
        typeof value.name === 'string' &&
        typeof value.department === 'string' &&
        typeof value.regionHint === 'string'
      );
    case 'remove':
      return typeof value.id === 'string';
    case 'clear':
      return true;
    case 'attach':
      return (
        typeof value.name === 'string' &&
        typeof value.regionHint === 'string' &&
        isRecordObject(value.summary)
      );
    case 'attach_comparison':
      return (
        typeof value.name === 'string' &&
        typeof value.regionHint === 'string' &&
        isRecordObject(value.comparison)
      );
    default:
      return false;
  }
}

function isMutateHistoryRequest(value: unknown): value is MutateHistoryRequest {
  return (
    isRecordObject(value) && value.type === 'MUTATE_HISTORY' && isHistoryMutation(value.mutation)
  );
}

const inFlightSsr = new Map<string, Promise<FetchModoodocSummaryResponse>>();
const inFlightComparison = new Map<string, Promise<FetchHospitalComparisonResponse>>();

async function fetchModoodocSsrSummary(
  hospitalName: string,
  regionHint: string,
): Promise<{ readonly ok: boolean; readonly summary: ModoodocHospitalSummary | null }> {
  const cleanName = normalizeHospitalName(hospitalName);
  const cleanRegion = extractRegionHintFromAddress(regionHint);
  const key = buildHospitalKey(cleanName, cleanRegion);

  const cached = await getCachedHospitalSummary(hospitalName, regionHint);
  if (cached.hit) {
    if (cached.summary !== null) {
      await attachSummaryToRecentHospital(hospitalName, regionHint, cached.summary);
    }
    return { ok: true, summary: cached.summary };
  }

  const running = inFlightSsr.get(key);
  if (running) {
    return running;
  }

  const task = (async (): Promise<FetchModoodocSummaryResponse> => {
    try {
      const searchUrl = buildModoodocSearchUrl(hospitalName, regionHint);
      const res = await fetch(searchUrl, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: 'text/html' },
      });

      if (!res.ok) {
        return { ok: false, summary: null };
      }

      const html = await res.text();
      const parsed = parseModoodocSearchResult(html, hospitalName, regionHint);
      if (parsed.kind === 'parse_error') {
        // 구조 오류는 미등록으로 캐시하지 않아 부정 캐시 오염을 차단한다.
        return { ok: false, summary: null };
      }

      const summary = parsed.kind === 'found' ? parsed.summary : null;
      await setCachedHospitalSummary(hospitalName, regionHint, summary);
      if (summary !== null) {
        await attachSummaryToRecentHospital(hospitalName, regionHint, summary);
      }

      return { ok: true, summary };
    } catch {
      return { ok: false, summary: null };
    } finally {
      inFlightSsr.delete(key);
    }
  })();

  inFlightSsr.set(key, task);
  return task;
}

async function fetchBackendMatch(
  hospitalName: string,
  regionHint: string,
  department: string,
  includeVat: boolean,
): Promise<HospitalComparisonSummary | null> {
  try {
    const url = new URL('/api/v1/hospitals/match', API_BASE_URL);
    url.searchParams.set('name', hospitalName);
    url.searchParams.set('regionHint', regionHint);
    url.searchParams.set('department', department);
    url.searchParams.set('includeVat', String(includeVat));

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(1200),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return null;
    }

    const json: unknown = await res.json();
    const parsed = MatchHospitalResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.hospital : null;
  } catch {
    return null;
  }
}

async function fetchHospitalComparison(
  req: FetchHospitalComparisonRequest,
): Promise<FetchHospitalComparisonResponse> {
  const cleanName = normalizeHospitalName(req.hospitalName);
  const cleanRegion = extractRegionHintFromAddress(req.regionHint);
  const key = buildHospitalKey(cleanName, cleanRegion);
  const includeVat = req.includeVat ?? true;

  const cachedComp = await getCachedHospitalComparison(req.hospitalName, req.regionHint);
  if (cachedComp.hit && cachedComp.comparison !== null) {
    await attachComparisonToRecentHospital(req.hospitalName, req.regionHint, cachedComp.comparison);
    return { ok: true, comparison: cachedComp.comparison, ssrSummary: null };
  }

  const running = inFlightComparison.get(key);
  if (running) {
    return running;
  }

  const task = (async (): Promise<FetchHospitalComparisonResponse> => {
    try {
      let comparison = await fetchBackendMatch(
        req.hospitalName,
        req.regionHint,
        req.department,
        includeVat,
      );

      if (comparison === null) {
        comparison = await seedRepo.matchHospital({
          name: req.hospitalName,
          regionHint: req.regionHint,
          department: req.department,
          includeVat,
        });
      }

      if (comparison !== null) {
        await setCachedHospitalComparison(req.hospitalName, req.regionHint, comparison);
        await attachComparisonToRecentHospital(req.hospitalName, req.regionHint, comparison);
        return { ok: true, comparison, ssrSummary: null };
      }

      // 정규화 DB·시드 미등록 병원은 기존 모두닥 SSR 요약 폴백 조회
      const ssr = await fetchModoodocSsrSummary(req.hospitalName, req.regionHint);
      return {
        ok: ssr.ok,
        comparison: null,
        ssrSummary: ssr.summary,
      };
    } catch {
      return { ok: false, comparison: null, ssrSummary: null };
    } finally {
      inFlightComparison.delete(key);
    }
  })();

  inFlightComparison.set(key, task);
  return task;
}

async function compareBoundsClinics(
  req: CompareBoundsClinicsRequest,
): Promise<CompareBoundsClinicsResponse> {
  const payload = {
    clinics: req.clinics,
    ...(req.department ? { department: req.department } : {}),
    includeVat: req.includeVat,
    sortBy: req.sortBy,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/hospitals/bounds`, {
      method: 'POST',
      signal: AbortSignal.timeout(1500),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json: unknown = await res.json();
      const parsed = BoundsComparisonResponseSchema.safeParse(json);
      if (parsed.success) {
        return { ok: true, items: parsed.data.items };
      }
    }
  } catch {
    // 백엔드 미실행 시 내장 시드 저장소로 무중단 폴백
  }

  const fallbackItems = await seedRepo.compareBounds({
    clinics: [...req.clinics],
    ...(req.department ? { department: req.department } : {}),
    includeVat: req.includeVat,
    sortBy: req.sortBy,
  });

  return { ok: true, items: fallbackItems };
}

async function openHospitalTarget(
  req: OpenModoodocHospitalRequest,
): Promise<OpenModoodocHospitalResponse> {
  let targetUrl = req.targetUrl ?? null;

  if (!targetUrl) {
    const comp = await fetchHospitalComparison({
      type: 'FETCH_HOSPITAL_COMPARISON',
      hospitalName: req.hospitalName,
      regionHint: req.regionHint,
      department: req.department,
    });
    targetUrl =
      comp.comparison?.lowestOffer?.bookingUrl ??
      comp.ssrSummary?.detailUrl ??
      buildModoodocSearchUrl(req.hospitalName, req.regionHint);
  }

  // 실제 새 탭 생성 성공 후에만 클릭 이력을 기록한다.
  await browser.tabs.create({ url: targetUrl });
  await markHospitalClicked({
    name: req.hospitalName,
    department: req.department,
    regionHint: req.regionHint,
  });

  return { ok: true, targetUrl };
}

export default defineBackground(() => {
  void getBridgeState().then((state) => syncToolbarActionIcon(state.bridgeEnabled));
  subscribeBridgeEnabled((enabled) => {
    void syncToolbarActionIcon(enabled);
  });

  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (isFetchHospitalComparisonRequest(message)) {
      fetchHospitalComparison(message)
        .then((response) => sendResponse(response))
        .catch(() => sendResponse({ ok: false, comparison: null, ssrSummary: null }));
      return true;
    }

    if (isFetchModoodocSummaryRequest(message)) {
      fetchModoodocSsrSummary(message.hospitalName, message.regionHint)
        .then((response) => sendResponse(response))
        .catch(() => sendResponse({ ok: false, summary: null }));
      return true;
    }

    if (isCompareBoundsClinicsRequest(message)) {
      compareBoundsClinics(message)
        .then((response) => sendResponse(response))
        .catch(() => sendResponse({ ok: false, items: [] }));
      return true;
    }

    if (isMutateHistoryRequest(message)) {
      applyHistoryMutation(message.mutation)
        .then((recentHospitals) => sendResponse({ ok: true, recentHospitals }))
        .catch(() => sendResponse({ ok: false, recentHospitals: [] }));
      return true;
    }

    if (isOpenModoodocHospitalRequest(message)) {
      openHospitalTarget(message)
        .then((response) => sendResponse(response))
        .catch(async () => {
          const fallbackUrl =
            message.targetUrl ?? buildModoodocSearchUrl(message.hospitalName, message.regionHint);
          try {
            await browser.tabs.create({ url: fallbackUrl });
          } catch {
            // ignore tab creation fallback failure
          }
          sendResponse({ ok: false, targetUrl: fallbackUrl });
        });
      return true;
    }

    return false;
  });
});
