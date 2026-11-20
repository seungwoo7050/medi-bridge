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

/**
 * storage.local은 read-modify-write 트랜잭션을 제공하지 않으므로, 모든 갱신을 Service Worker 단일 FIFO 큐로 직렬화합니다.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

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

export async function setBridgeEnabled(enabled: boolean): Promise<void> {
  await browser.storage.local.set({ [BRIDGE_ENABLED_KEY]: enabled });
}

async function upsertHospitalHistoryUnlocked(
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

export async function recordHospitalView(
  input: HospitalHistoryInput,
): Promise<readonly RecentHospitalRecord[]> {
  return enqueueWrite(() => upsertHospitalHistoryUnlocked(input, false));
}

export async function markHospitalClicked(
  input: HospitalHistoryInput,
): Promise<readonly RecentHospitalRecord[]> {
  return enqueueWrite(() => upsertHospitalHistoryUnlocked(input, true));
}

async function removeRecentHospitalUnlocked(id: string): Promise<readonly RecentHospitalRecord[]> {
  const stored = await browser.storage.local.get(RECENT_HOSPITALS_KEY);
  const existingList = parseRecentHospitals(stored[RECENT_HOSPITALS_KEY]);
  const nextList = existingList.filter((item) => item.id !== id);
  await browser.storage.local.set({ [RECENT_HOSPITALS_KEY]: nextList });
  return nextList;
}

async function clearRecentHospitalsUnlocked(): Promise<void> {
  await browser.storage.local.set({ [RECENT_HOSPITALS_KEY]: [] });
}

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

async function setCachedHospitalSummaryUnlocked(
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

async function attachPreviewToRecentHospitalUnlocked(
  name: string,
  regionHint: string,
  preview: HospitalPreviewSummary,
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
    summary: preview,
  };

  const nextList = [
    ...existingList.slice(0, targetIndex),
    updatedItem,
    ...existingList.slice(targetIndex + 1),
  ];

  await browser.storage.local.set({ [RECENT_HOSPITALS_KEY]: nextList });
  return nextList;
}

export function removeRecentHospital(id: string): Promise<readonly RecentHospitalRecord[]> {
  return enqueueWrite(() => removeRecentHospitalUnlocked(id));
}

export function clearRecentHospitals(): Promise<void> {
  return enqueueWrite(() => clearRecentHospitalsUnlocked());
}

export function setCachedHospitalSummary(
  name: string,
  regionHint: string,
  summary: ModoodocHospitalSummary | null,
): Promise<void> {
  return enqueueWrite(() => setCachedHospitalSummaryUnlocked(name, regionHint, summary));
}

export function attachSummaryToRecentHospital(
  name: string,
  regionHint: string,
  summary: ModoodocHospitalSummary,
): Promise<readonly RecentHospitalRecord[]> {
  return enqueueWrite(() =>
    attachPreviewToRecentHospitalUnlocked(name, regionHint, toHospitalPreviewSummary(summary)),
  );
}
