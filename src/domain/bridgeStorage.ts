import { browser } from 'wxt/browser';
import { toHospitalPreviewSummary } from '../adapters/modoodocSearchParser';
import type {
  BridgeStorageState,
  CachedModoodocEntry,
  HospitalPreviewSummary,
  ModoodocHospitalSummary,
  RecentHospitalRecord,
} from '../types/place';
import {
  buildHospitalKey,
  buildModoodocSearchUrl,
  extractRegionHintFromAddress,
  normalizeHospitalName,
} from './modoodocUrl';

export const BRIDGE_ENABLED_KEY = 'bridgeEnabled';
export const RECENT_HOSPITALS_KEY = 'recentHospitals';
export const SUMMARY_CACHE_KEY = 'modoodocSummaryCache';

export const MAX_RECENT_HOSPITALS = 20;
export const MAX_SUMMARY_CACHE = 60;
export const SUMMARY_HIT_TTL_MS = 24 * 60 * 60 * 1000;
export const SUMMARY_MISS_TTL_MS = 30 * 60 * 1000;

export interface HospitalHistoryInput {
  readonly name: string;
  readonly department: string;
  readonly regionHint: string;
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isHospitalPreviewSummary(value: unknown): value is HospitalPreviewSummary {
  if (!isRecordObject(value)) {
    return false;
  }
  return (
    typeof value.detailUrl === 'string' &&
    (value.totalScore === null || typeof value.totalScore === 'number') &&
    typeof value.reviewCount === 'number' &&
    (value.representativeTreatment === null || typeof value.representativeTreatment === 'string') &&
    (value.representativePrice === null || typeof value.representativePrice === 'string')
  );
}

export function isRecentHospitalRecord(value: unknown): value is RecentHospitalRecord {
  if (!isRecordObject(value)) {
    return false;
  }

  const hasBaseFields =
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.department === 'string' &&
    typeof value.regionHint === 'string' &&
    typeof value.searchUrl === 'string' &&
    typeof value.viewedAt === 'number' &&
    typeof value.clickedModoodoc === 'boolean';

  if (!hasBaseFields) {
    return false;
  }

  return (
    value.summary === undefined || value.summary === null || isHospitalPreviewSummary(value.summary)
  );
}

function parseRecentHospitals(raw: unknown): RecentHospitalRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter(isRecentHospitalRecord)
    .map((item) => ({
      id: item.id,
      name: item.name,
      department: item.department,
      regionHint: item.regionHint,
      searchUrl: item.searchUrl,
      viewedAt: item.viewedAt,
      clickedModoodoc: item.clickedModoodoc,
      summary: isHospitalPreviewSummary(item.summary) ? item.summary : null,
    }))
    .slice(0, MAX_RECENT_HOSPITALS);
}

function isCachedModoodocEntry(value: unknown): value is CachedModoodocEntry {
  if (!isRecordObject(value)) {
    return false;
  }
  return (
    typeof value.key === 'string' &&
    typeof value.fetchedAt === 'number' &&
    (value.summary === null || isRecordObject(value.summary))
  );
}

function parseSummaryCache(raw: unknown): CachedModoodocEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isCachedModoodocEntry).slice(0, MAX_SUMMARY_CACHE);
}

/**
 * 현재 배지 활성화 여부와 최근 본 병원 목록을 스토리지에서 안전하게 읽어옵니다.
 */
export async function getBridgeState(): Promise<BridgeStorageState> {
  const stored = await browser.storage.local.get([BRIDGE_ENABLED_KEY, RECENT_HOSPITALS_KEY]);

  const rawEnabled = stored[BRIDGE_ENABLED_KEY];
  const bridgeEnabled = typeof rawEnabled === 'boolean' ? rawEnabled : true;
  const recentHospitals = parseRecentHospitals(stored[RECENT_HOSPITALS_KEY]);

  return {
    bridgeEnabled,
    recentHospitals,
  };
}

/**
 * 네이버 지도 내 배지·미니 버튼 노출 활성화 상태를 저장합니다.
 */
export async function setBridgeEnabled(enabled: boolean): Promise<void> {
  await browser.storage.local.set({ [BRIDGE_ENABLED_KEY]: enabled });
}

async function upsertHospitalHistory(
  input: HospitalHistoryInput,
  markClicked: boolean,
): Promise<readonly RecentHospitalRecord[]> {
  const cleanName = normalizeHospitalName(input.name);
  if (!cleanName) {
    const current = await getBridgeState();
    return current.recentHospitals;
  }

  const cleanRegion = extractRegionHintFromAddress(input.regionHint);
  const id = buildHospitalKey(cleanName, cleanRegion);
  const searchUrl = buildModoodocSearchUrl(cleanName, cleanRegion);

  const stored = await browser.storage.local.get([RECENT_HOSPITALS_KEY, SUMMARY_CACHE_KEY]);
  const existingList = parseRecentHospitals(stored[RECENT_HOSPITALS_KEY]);
  const existingRecord = existingList.find((item) => item.id === id);

  let resolvedSummary = existingRecord?.summary ?? null;
  if (resolvedSummary === null) {
    const cache = parseSummaryCache(stored[SUMMARY_CACHE_KEY]);
    const cachedEntry = cache.find((item) => item.key === id);
    if (
      cachedEntry &&
      cachedEntry.summary !== null &&
      Date.now() - cachedEntry.fetchedAt < SUMMARY_HIT_TTL_MS
    ) {
      resolvedSummary = toHospitalPreviewSummary(cachedEntry.summary);
    }
  }

  const nextRecord: RecentHospitalRecord = {
    id,
    name: cleanName,
    department: input.department.trim() || existingRecord?.department || '병원',
    regionHint: cleanRegion,
    searchUrl,
    viewedAt: Date.now(),
    clickedModoodoc: markClicked || existingRecord?.clickedModoodoc === true,
    summary: resolvedSummary,
  };

  const nextList = [nextRecord, ...existingList.filter((item) => item.id !== id)].slice(
    0,
    MAX_RECENT_HOSPITALS,
  );

  await browser.storage.local.set({ [RECENT_HOSPITALS_KEY]: nextList });
  return nextList;
}

/**
 * 상세 패널에서 병원을 열람했을 때 최근 본 병원 목록 상단에 기록합니다.
 * 기존에 모두닥 버튼을 클릭한 이력과 summary 상태를 보존합니다.
 */
export async function recordHospitalView(
  input: HospitalHistoryInput,
): Promise<readonly RecentHospitalRecord[]> {
  return upsertHospitalHistory(input, false);
}

/**
 * 사용자가 [모두닥 영수증 리뷰 보기] 배지 또는 미니 버튼을 클릭했을 때 clickedModoodoc을 true로 기록합니다.
 */
export async function markHospitalClicked(
  input: HospitalHistoryInput,
): Promise<readonly RecentHospitalRecord[]> {
  return upsertHospitalHistory(input, true);
}

/**
 * 최근 본 병원 목록에서 특정 항목만 제거합니다.
 */
export async function removeRecentHospital(id: string): Promise<readonly RecentHospitalRecord[]> {
  const stored = await browser.storage.local.get(RECENT_HOSPITALS_KEY);
  const existingList = parseRecentHospitals(stored[RECENT_HOSPITALS_KEY]);
  const nextList = existingList.filter((item) => item.id !== id);
  await browser.storage.local.set({ [RECENT_HOSPITALS_KEY]: nextList });
  return nextList;
}

/**
 * 최근 본 병원 목록 전체를 비웁니다.
 */
export async function clearRecentHospitals(): Promise<void> {
  await browser.storage.local.set({ [RECENT_HOSPITALS_KEY]: [] });
}

/**
 * Popup 등에서 배지 ON/OFF 상태를 변경할 때 실시간으로 알림을 받습니다.
 * 반환된 함수를 호출해 구독을 해제할 수 있습니다.
 */
export function subscribeBridgeEnabled(onChange: (enabled: boolean) => void): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
    areaName: string,
  ) => {
    if (areaName !== 'local') {
      return;
    }
    const change = changes[BRIDGE_ENABLED_KEY];
    if (change && typeof change.newValue === 'boolean') {
      onChange(change.newValue);
    }
  };

  browser.storage.onChanged.addListener(listener);
  return () => {
    browser.storage.onChanged.removeListener(listener);
  };
}

/**
 * 최근 본 병원 목록 변경 사항을 실시간으로 구독합니다.
 */
export function subscribeRecentHospitals(
  onChange: (records: readonly RecentHospitalRecord[]) => void,
): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
    areaName: string,
  ) => {
    if (areaName !== 'local') {
      return;
    }
    const change = changes[RECENT_HOSPITALS_KEY];
    if (change && Array.isArray(change.newValue)) {
      onChange(parseRecentHospitals(change.newValue));
    }
  };

  browser.storage.onChanged.addListener(listener);
  return () => {
    browser.storage.onChanged.removeListener(listener);
  };
}

/**
 * 로컬 캐시에서 모두닥 병원 요약 정보를 조회합니다.
 * 만료된 항목은 hit: false로 반환합니다.
 */
export async function getCachedHospitalSummary(
  name: string,
  regionHint: string,
): Promise<{ hit: boolean; summary: ModoodocHospitalSummary | null }> {
  const cleanName = normalizeHospitalName(name);
  const cleanRegion = extractRegionHintFromAddress(regionHint);
  const key = buildHospitalKey(cleanName, cleanRegion);

  const stored = await browser.storage.local.get(SUMMARY_CACHE_KEY);
  const cache = parseSummaryCache(stored[SUMMARY_CACHE_KEY]);
  const entry = cache.find((item) => item.key === key);

  if (!entry) {
    return { hit: false, summary: null };
  }

  const age = Date.now() - entry.fetchedAt;
  const maxTtl = entry.summary !== null ? SUMMARY_HIT_TTL_MS : SUMMARY_MISS_TTL_MS;

  if (age >= maxTtl) {
    return { hit: false, summary: null };
  }

  return { hit: true, summary: entry.summary };
}

/**
 * 모두닥 병원 요약 정보를 로컬 캐시에 저장합니다 (최대 60건 LRU).
 */
export async function setCachedHospitalSummary(
  name: string,
  regionHint: string,
  summary: ModoodocHospitalSummary | null,
): Promise<void> {
  const cleanName = normalizeHospitalName(name);
  const cleanRegion = extractRegionHintFromAddress(regionHint);
  const key = buildHospitalKey(cleanName, cleanRegion);

  const stored = await browser.storage.local.get(SUMMARY_CACHE_KEY);
  const cache = parseSummaryCache(stored[SUMMARY_CACHE_KEY]);

  const newEntry: CachedModoodocEntry = {
    key,
    fetchedAt: Date.now(),
    summary,
  };

  const nextCache = [newEntry, ...cache.filter((item) => item.key !== key)].slice(
    0,
    MAX_SUMMARY_CACHE,
  );

  await browser.storage.local.set({ [SUMMARY_CACHE_KEY]: nextCache });
}

/**
 * 최근 본 병원 목록에 존재하는 항목에 모두닥 요약 정보(미리보기용)를 첨부합니다.
 * 항목이 존재할 때만 업데이트하고 저장합니다.
 */
export async function attachSummaryToRecentHospital(
  name: string,
  regionHint: string,
  summary: ModoodocHospitalSummary,
): Promise<readonly RecentHospitalRecord[]> {
  const cleanName = normalizeHospitalName(name);
  const cleanRegion = extractRegionHintFromAddress(regionHint);
  const id = buildHospitalKey(cleanName, cleanRegion);

  const stored = await browser.storage.local.get(RECENT_HOSPITALS_KEY);
  const existingList = parseRecentHospitals(stored[RECENT_HOSPITALS_KEY]);
  const targetIndex = existingList.findIndex((item) => item.id === id);

  if (targetIndex === -1) {
    return existingList;
  }

  const targetItem = existingList[targetIndex];
  if (!targetItem) {
    return existingList;
  }

  const updatedItem: RecentHospitalRecord = {
    ...targetItem,
    summary: toHospitalPreviewSummary(summary),
  };

  const nextList = [
    ...existingList.slice(0, targetIndex),
    updatedItem,
    ...existingList.slice(targetIndex + 1),
  ];

  await browser.storage.local.set({ [RECENT_HOSPITALS_KEY]: nextList });
  return nextList;
}
