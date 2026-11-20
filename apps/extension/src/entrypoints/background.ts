import { normalizeCompareName } from '@medi-bridge/shared';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { parseModoodocSearchResult } from '../adapters/modoodocSearchParser';
import {
  attachSummaryToRecentHospital,
  getBridgeState,
  getCachedHospitalSummary,
  markHospitalClicked,
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
import type {
  FetchModoodocSummaryRequest,
  FetchModoodocSummaryResponse,
  HistoryMutation,
  MutateHistoryRequest,
  OpenModoodocHospitalRequest,
  OpenModoodocHospitalResponse,
  RegisterSearchRegionHintsRequest,
} from '../types/place';

const MAX_SEARCH_REGION_HINTS = 300;
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

function isRegisterSearchRegionHintsRequest(
  value: unknown,
): value is RegisterSearchRegionHintsRequest {
  return (
    isRecordObject(value) &&
    value.type === 'REGISTER_SEARCH_REGION_HINTS' &&
    Array.isArray(value.items)
  );
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
const searchRegionHints = new Map<string, string>();

function registerSearchRegionHints(items: readonly unknown[]): void {
  for (const raw of items) {
    if (!isRecordObject(raw)) continue;
    if (typeof raw.name !== 'string' || typeof raw.regionHint !== 'string') continue;
    const cleanName = normalizeCompareName(normalizeHospitalName(raw.name));
    const cleanRegion = extractRegionHintFromAddress(raw.regionHint);
    if (!cleanName || !cleanRegion) continue;
    searchRegionHints.delete(cleanName);
    searchRegionHints.set(cleanName, cleanRegion);
    while (searchRegionHints.size > MAX_SEARCH_REGION_HINTS) {
      const oldest = searchRegionHints.keys().next().value;
      if (oldest === undefined) break;
      searchRegionHints.delete(oldest);
    }
  }
}

function resolveEffectiveRegion(hospitalName: string, regionHint: string): string {
  const direct = extractRegionHintFromAddress(regionHint);
  if (direct) {
    return direct;
  }
  const key = normalizeCompareName(normalizeHospitalName(hospitalName));
  return searchRegionHints.get(key) ?? '';
}

async function fetchModoodocSsrSummary(
  hospitalName: string,
  regionHint: string,
): Promise<FetchModoodocSummaryResponse> {
  const cleanName = normalizeHospitalName(hospitalName);
  const directRegion = extractRegionHintFromAddress(regionHint);
  const effectiveRegion = resolveEffectiveRegion(hospitalName, regionHint);
  const hasEffectiveRegion = effectiveRegion.length > 0;
  const key = buildHospitalKey(cleanName, effectiveRegion);

  const cached = await getCachedHospitalSummary(hospitalName, effectiveRegion);
  // 지역 힌트가 비어 있을 때 과거 부정 캐시로 조기 종료하지 않음
  if (cached.hit && (cached.summary !== null || hasEffectiveRegion)) {
    if (cached.summary !== null) {
      await attachSummaryToRecentHospital(hospitalName, effectiveRegion, cached.summary);
      if (directRegion !== effectiveRegion) {
        await attachSummaryToRecentHospital(hospitalName, directRegion, cached.summary);
      }
    }
    return { ok: true, summary: cached.summary };
  }

  const running = inFlightSsr.get(key);
  if (running) {
    return running;
  }

  const task = (async (): Promise<FetchModoodocSummaryResponse> => {
    try {
      const searchUrl = buildModoodocSearchUrl(hospitalName, effectiveRegion);
      const res = await fetch(searchUrl, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: 'text/html' },
      });

      if (!res.ok) {
        return { ok: false, summary: null };
      }

      const html = await res.text();
      const parsed = parseModoodocSearchResult(html, hospitalName, effectiveRegion);
      if (parsed.kind === 'parse_error') {
        // 구조 오류는 미등록으로 캐시하지 않아 부정 캐시 오염을 차단한다.
        return { ok: false, summary: null };
      }

      if (parsed.kind === 'not_found') {
        // 지역 누락 상태의 not_found는 부정 캐시에 넣지 않아 주소 릴레이 후 즉시 재시도한다.
        if (hasEffectiveRegion) {
          await setCachedHospitalSummary(hospitalName, effectiveRegion, null);
        }
        return { ok: true, summary: null };
      }

      await setCachedHospitalSummary(hospitalName, effectiveRegion, parsed.summary);
      await attachSummaryToRecentHospital(hospitalName, effectiveRegion, parsed.summary);
      if (directRegion !== effectiveRegion) {
        await attachSummaryToRecentHospital(hospitalName, directRegion, parsed.summary);
      }

      return { ok: true, summary: parsed.summary };
    } catch {
      return { ok: false, summary: null };
    } finally {
      inFlightSsr.delete(key);
    }
  })();

  inFlightSsr.set(key, task);
  return task;
}

async function openHospitalTarget(
  req: OpenModoodocHospitalRequest,
): Promise<OpenModoodocHospitalResponse> {
  const effectiveRegion = resolveEffectiveRegion(req.hospitalName, req.regionHint);
  let targetUrl = req.targetUrl ?? null;

  if (!targetUrl) {
    const resolved = await fetchModoodocSsrSummary(req.hospitalName, effectiveRegion);
    targetUrl =
      resolved.summary?.detailUrl ?? buildModoodocSearchUrl(req.hospitalName, effectiveRegion);
  }

  // 실제 새 탭 생성 성공 후에만 클릭 이력을 기록한다.
  await browser.tabs.create({ url: targetUrl });
  await markHospitalClicked({
    name: req.hospitalName,
    department: req.department,
    regionHint: effectiveRegion,
  });

  return { ok: true, targetUrl };
}

export default defineBackground(() => {
  void browser.storage.local
    .remove(['mediBridgeComparisonCache', 'vatIncluded'])
    .catch(() => undefined);
  void getBridgeState().then((state) => syncToolbarActionIcon(state.bridgeEnabled));
  subscribeBridgeEnabled((enabled) => {
    void syncToolbarActionIcon(enabled);
  });

  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (isRegisterSearchRegionHintsRequest(message)) {
      registerSearchRegionHints(message.items);
      sendResponse({ ok: true });
      return false;
    }

    if (isFetchModoodocSummaryRequest(message)) {
      fetchModoodocSsrSummary(message.hospitalName, message.regionHint)
        .then((response) => sendResponse(response))
        .catch(() => sendResponse({ ok: false, summary: null }));
      return true;
    }

    if (isMutateHistoryRequest(message)) {
      const mutation =
        (message.mutation.op === 'view' || message.mutation.op === 'click') &&
        !message.mutation.regionHint
          ? {
              ...message.mutation,
              regionHint: resolveEffectiveRegion(
                message.mutation.name,
                message.mutation.regionHint,
              ),
            }
          : message.mutation;
      applyHistoryMutation(mutation)
        .then((recentHospitals) => sendResponse({ ok: true, recentHospitals }))
        .catch(() => sendResponse({ ok: false, recentHospitals: [] }));
      return true;
    }

    if (isOpenModoodocHospitalRequest(message)) {
      openHospitalTarget(message)
        .then((response) => sendResponse(response))
        .catch(async () => {
          const effectiveRegion = resolveEffectiveRegion(message.hospitalName, message.regionHint);
          const fallbackUrl =
            message.targetUrl ?? buildModoodocSearchUrl(message.hospitalName, effectiveRegion);
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
