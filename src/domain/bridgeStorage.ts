import { browser } from 'wxt/browser';
import type { BridgeStorageState, RecentHospitalRecord } from '../types/place';
import {
  buildHospitalKey,
  buildModoodocSearchUrl,
  extractRegionHintFromAddress,
  normalizeHospitalName,
} from './modoodocUrl';

export const BRIDGE_ENABLED_KEY = 'bridgeEnabled';
export const RECENT_HOSPITALS_KEY = 'recentHospitals';
export const MAX_RECENT_HOSPITALS = 20;

export interface HospitalHistoryInput {
  readonly name: string;
  readonly department: string;
  readonly regionHint: string;
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isRecentHospitalRecord(value: unknown): value is RecentHospitalRecord {
  if (!isRecordObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.department === 'string' &&
    typeof value.regionHint === 'string' &&
    typeof value.searchUrl === 'string' &&
    typeof value.viewedAt === 'number' &&
    typeof value.clickedModoodoc === 'boolean'
  );
}

function parseRecentHospitals(raw: unknown): RecentHospitalRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isRecentHospitalRecord).slice(0, MAX_RECENT_HOSPITALS);
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

  const stored = await browser.storage.local.get(RECENT_HOSPITALS_KEY);
  const existingList = parseRecentHospitals(stored[RECENT_HOSPITALS_KEY]);
  const existingRecord = existingList.find((item) => item.id === id);

  const nextRecord: RecentHospitalRecord = {
    id,
    name: cleanName,
    department: input.department.trim() || existingRecord?.department || '병원',
    regionHint: cleanRegion,
    searchUrl,
    viewedAt: Date.now(),
    clickedModoodoc: markClicked || existingRecord?.clickedModoodoc === true,
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
 * 기존에 모두닥 버튼을 클릭한 이력이 있으면 clickedModoodoc 상태를 유지합니다.
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
