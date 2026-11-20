import { beforeEach, describe, expect, it, vi } from 'vitest';

const store: Record<string, unknown> = {};
type StorageListener = (
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  areaName: string,
) => void;
const listeners = new Set<StorageListener>();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (typeof keys === 'string') {
            return keys in store ? { [keys]: store[keys] } : {};
          }
          if (Array.isArray(keys)) {
            const result: Record<string, unknown> = {};
            for (const key of keys) {
              if (key in store) {
                result[key] = store[key];
              }
            }
            return result;
          }
          return { ...store };
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          const changes: Record<string, { newValue?: unknown; oldValue?: unknown }> = {};
          for (const [key, value] of Object.entries(items)) {
            changes[key] = { oldValue: store[key], newValue: value };
            store[key] = value;
          }
          for (const listener of listeners) {
            listener(changes, 'local');
          }
        }),
      },
      onChanged: {
        addListener: vi.fn((listener: StorageListener) => {
          listeners.add(listener);
        }),
        removeListener: vi.fn((listener: StorageListener) => {
          listeners.delete(listener);
        }),
      },
    },
  },
}));

import {
  attachSummaryToRecentHospital,
  clearRecentHospitals,
  getBridgeState,
  getCachedHospitalSummary,
  MAX_RECENT_HOSPITALS,
  markHospitalClicked,
  RECENT_HOSPITALS_KEY,
  recordHospitalView,
  removeRecentHospital,
  SUMMARY_HIT_TTL_MS,
  SUMMARY_MISS_TTL_MS,
  setBridgeEnabled,
  setCachedHospitalSummary,
  subscribeBridgeEnabled,
  subscribeRecentHospitals,
} from '../src/domain/bridgeStorage';
import type { ModoodocHospitalSummary } from '../src/types/place';

const SAMPLE_SUMMARY: ModoodocHospitalSummary = {
  hospitalId: 86566,
  name: '강남케이안과의원',
  address: '서울 강남구 역삼1동',
  detailUrl: 'https://www.modoodoc.com/hospital/86566/test',
  totalScore: 10,
  reviewCount: 10,
  topTreatments: [{ name: '스마일라식', count: 9 }],
  topPrices: [
    {
      name: '스마일라식',
      displayPrice: '2,090,000원',
      originalPrice: '3,500,000원',
      discountPercent: 40,
      badge: '이벤트',
      numericPrice: 2090000,
    },
  ],
  totalPriceCount: 1,
};

describe('bridgeStorage', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    listeners.clear();
    vi.useRealTimers();
  });

  it('초기 상태는 bridgeEnabled=true, recentHospitals=[]를 반환한다', async () => {
    const state = await getBridgeState();
    expect(state).toEqual({
      bridgeEnabled: true,
      recentHospitals: [],
    });
  });

  it('병원 열람과 모두닥 클릭 여부를 LRU 순서로 저장하고 clickedModoodoc 상태를 보존한다', async () => {
    await recordHospitalView({
      name: '강남밝은안과의원',
      department: '안과',
      regionHint: '서울 강남구',
    });
    await markHospitalClicked({
      name: '강남밝은안과의원',
      department: '안과',
      regionHint: '서울 강남구',
    });
    await recordHospitalView({
      name: '서초바른치과의원',
      department: '치과',
      regionHint: '서울 서초구',
    });
    const list = await recordHospitalView({
      name: '강남밝은안과의원',
      department: '안과',
      regionHint: '서울 강남구',
    });

    expect(list).toHaveLength(2);
    expect(list[0]?.name).toBe('강남밝은안과의원');
    expect(list[0]?.clickedModoodoc).toBe(true);
    expect(list[0]?.summary).toBeNull();
    expect(list[1]?.name).toBe('서초바른치과의원');
    expect(list[1]?.clickedModoodoc).toBe(false);
  });

  it('최근 본 병원은 최대 20건까지만 유지한다', async () => {
    for (let i = 1; i <= MAX_RECENT_HOSPITALS + 5; i += 1) {
      await recordHospitalView({
        name: `테스트의원 ${i}`,
        department: '내과',
        regionHint: '서울 강남구',
      });
    }

    const state = await getBridgeState();
    expect(state.recentHospitals).toHaveLength(MAX_RECENT_HOSPITALS);
    expect(state.recentHospitals[0]?.name).toBe(`테스트의원 ${MAX_RECENT_HOSPITALS + 5}`);
  });

  it('개별 삭제와 전체 비우기가 정상 동작한다', async () => {
    const list = await recordHospitalView({
      name: '연세피부과의원',
      department: '피부과',
      regionHint: '서울 마포구',
    });
    await recordHospitalView({
      name: '신촌한의원',
      department: '한의원',
      regionHint: '서울 서대문구',
    });

    const firstId = list[0]?.id ?? '';
    const afterRemove = await removeRecentHospital(firstId);
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove[0]?.name).toBe('신촌한의원');

    await clearRecentHospitals();
    const afterClear = await getBridgeState();
    expect(afterClear.recentHospitals).toEqual([]);
  });

  it('subscribeBridgeEnabled와 subscribeRecentHospitals는 실시간 변경을 전달한다', async () => {
    const enabledCallback = vi.fn();
    const recentCallback = vi.fn();
    const unsubEnabled = subscribeBridgeEnabled(enabledCallback);
    const unsubRecent = subscribeRecentHospitals(recentCallback);

    await setBridgeEnabled(false);
    await recordHospitalView({
      name: '강남케이안과의원',
      department: '안과',
      regionHint: '서울 강남구',
    });

    expect(enabledCallback).toHaveBeenCalledWith(false);
    expect(recentCallback).toHaveBeenCalledTimes(1);

    unsubEnabled();
    unsubRecent();
    await setBridgeEnabled(true);
    expect(enabledCallback).toHaveBeenCalledTimes(1);
  });

  it('summary 필드가 없는 레거시 레코드도 안전하게 호환하고 attachSummaryToRecentHospital로 병합한다', async () => {
    store[RECENT_HOSPITALS_KEY] = [
      {
        id: '강남케이안과의원::서울 강남구',
        name: '강남케이안과의원',
        department: '안과',
        regionHint: '서울 강남구',
        searchUrl: 'https://www.modoodoc.com/hospitals/query-search?search_query=test',
        viewedAt: Date.now(),
        clickedModoodoc: false,
      },
    ];

    const initialState = await getBridgeState();
    expect(initialState.recentHospitals[0]?.summary).toBeNull();

    const updated = await attachSummaryToRecentHospital(
      '강남케이안과의원',
      '서울 강남구',
      SAMPLE_SUMMARY,
    );
    expect(updated[0]?.summary).toEqual({
      detailUrl: 'https://www.modoodoc.com/hospital/86566/test',
      totalScore: 10,
      reviewCount: 10,
      representativeTreatment: '스마일라식',
      representativePrice: '2,090,000원',
      platformLabel: '모두닥',
    });

    // 다시 열람해도 summary가 유지되어야 함
    const afterRevisit = await recordHospitalView({
      name: '강남케이안과의원',
      department: '안과',
      regionHint: '서울 강남구',
    });
    expect(afterRevisit[0]?.summary?.representativePrice).toBe('2,090,000원');
  });

  it('요약 캐시 hit/miss TTL 만료를 정확히 판정한다', async () => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-11-13T10:00:00Z').getTime();
    vi.setSystemTime(baseTime);

    await setCachedHospitalSummary('강남케이안과의원', '서울 강남구', SAMPLE_SUMMARY);
    await setCachedHospitalSummary('미등록의원', '서울 서초구', null);

    expect(await getCachedHospitalSummary('강남케이안과의원', '서울 강남구')).toEqual({
      hit: true,
      summary: SAMPLE_SUMMARY,
    });
    expect(await getCachedHospitalSummary('미등록의원', '서울 서초구')).toEqual({
      hit: true,
      summary: null,
    });

    // 30분 경과 시 miss 캐시는 만료, hit 캐시는 유지
    vi.setSystemTime(baseTime + SUMMARY_MISS_TTL_MS + 1000);
    expect(await getCachedHospitalSummary('미등록의원', '서울 서초구')).toEqual({
      hit: false,
      summary: null,
    });
    expect((await getCachedHospitalSummary('강남케이안과의원', '서울 강남구')).hit).toBe(true);

    // 24시간 경과 시 hit 캐시도 만료
    vi.setSystemTime(baseTime + SUMMARY_HIT_TTL_MS + 1000);
    expect(await getCachedHospitalSummary('강남케이안과의원', '서울 강남구')).toEqual({
      hit: false,
      summary: null,
    });
  });
});

describe('동시 갱신', () => {
  beforeEach(() => {
    vi.useRealTimers();
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  });

  it('서로 다른 병원의 기록을 동시에 갱신해도 둘 다 남는다', async () => {
    await Promise.all([
      recordHospitalView({ name: '가나다의원', department: '내과', regionHint: '서울 강남구' }),
      markHospitalClicked({ name: '라마바의원', department: '피부과', regionHint: '서울 서초구' }),
    ]);

    const state = await getBridgeState();
    expect(state.recentHospitals.map((item) => item.name).sort()).toEqual([
      '가나다의원',
      '라마바의원',
    ]);
  });

  it('요약 캐시를 동시에 저장해도 두 항목이 모두 남는다', async () => {
    await Promise.all([
      setCachedHospitalSummary('강남케이안과의원', '서울 강남구', SAMPLE_SUMMARY),
      setCachedHospitalSummary('미등록의원', '서울 서초구', null),
    ]);

    expect((await getCachedHospitalSummary('강남케이안과의원', '서울 강남구')).hit).toBe(true);
    expect((await getCachedHospitalSummary('미등록의원', '서울 서초구')).hit).toBe(true);
  });
});
