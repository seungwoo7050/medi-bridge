import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getBridgeState, RECENT_HOSPITALS_KEY, setBridgeEnabled } from '../../domain/bridgeStorage';
import {
  clearRecentHospitalsViaWorker,
  markHospitalClickedViaWorker,
  removeRecentHospitalViaWorker,
} from '../../domain/historyGateway';
import { buildModoodocSearchUrl } from '../../domain/modoodocUrl';
import type { OpenModoodocHospitalRequest, RecentHospitalRecord } from '../../types/place';

function formatRelativeTime(timestamp: number): string {
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) {
    return '방금 전';
  }
  if (diffMin < 60) {
    return `${diffMin}분 전`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour}시간 전`;
  }
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

async function openExternalTab(url: string): Promise<void> {
  try {
    await browser.tabs.create({ url });
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function PopupApp(): React.JSX.Element {
  const [bridgeEnabled, setBridgeEnabledState] = useState<boolean>(true);
  const [recentHospitals, setRecentHospitals] = useState<readonly RecentHospitalRecord[]>([]);
  const [searchInput, setSearchInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const loadState = useCallback(async () => {
    const state = await getBridgeState();
    setBridgeEnabledState(state.bridgeEnabled);
    setRecentHospitals(state.recentHospitals);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadState();

    const handleStorageChange = (
      changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
      areaName: string,
    ) => {
      if (areaName !== 'local') {
        return;
      }
      if ('bridgeEnabled' in changes || RECENT_HOSPITALS_KEY in changes) {
        void loadState();
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [loadState]);

  const handleToggle = async () => {
    const nextValue = !bridgeEnabled;
    setBridgeEnabledState(nextValue);
    await setBridgeEnabled(nextValue);
  };

  const handleQuickSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      return;
    }
    const targetUrl = buildModoodocSearchUrl(trimmed);
    setSearchInput('');
    await openExternalTab(targetUrl);
  };

  const handleOpenHistoryItem = async (record: RecentHospitalRecord) => {
    if (record.summary?.detailUrl) {
      const updated = await markHospitalClickedViaWorker({
        name: record.name,
        department: record.department,
        regionHint: record.regionHint,
      });
      setRecentHospitals(updated);
      await openExternalTab(record.summary.detailUrl);
      return;
    }

    const req: OpenModoodocHospitalRequest = {
      type: 'OPEN_MODOODOC_HOSPITAL',
      hospitalName: record.name,
      regionHint: record.regionHint,
      department: record.department,
    };

    try {
      await browser.runtime.sendMessage(req);
      await loadState();
    } catch {
      const updated = await markHospitalClickedViaWorker({
        name: record.name,
        department: record.department,
        regionHint: record.regionHint,
      });
      setRecentHospitals(updated);
      await openExternalTab(record.searchUrl);
    }
  };

  const handleRemoveItem = async (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    const updated = await removeRecentHospitalViaWorker(id);
    setRecentHospitals(updated);
  };

  const handleClearAll = async () => {
    await clearRecentHospitalsViaWorker();
    setRecentHospitals([]);
  };

  return (
    <div className="popup-shell">
      <header className="popup-header">
        <div className="popup-brand">
          <div className="popup-logo" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <title>모두닥 로고</title>
              <path d="M7.1 3.5H8.9V7.1H12.5V8.9H8.9V12.5H7.1V8.9H3.5V7.1H7.1V3.5Z" fill="white" />
            </svg>
          </div>
          <div>
            <h1 className="popup-title">모두닥 리뷰 브릿지</h1>
            <p className="popup-subtitle">네이버 지도 병원 영수증 리뷰 연결</p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={bridgeEnabled}
          aria-label="네이버 지도 내 모두닥 배지 자동 표시"
          className={`toggle-switch ${bridgeEnabled ? 'is-on' : 'is-off'}`}
          onClick={() => {
            void handleToggle();
          }}
        >
          <span className="toggle-thumb" />
        </button>
      </header>

      <section className="popup-status-banner">
        <span className={`status-dot ${bridgeEnabled ? 'is-active' : 'is-paused'}`} />
        <span className="status-text">
          {bridgeEnabled
            ? '네이버 지도에서 병원 배지 자동 표시 중'
            : '배지 표시가 일시 중지되었습니다'}
        </span>
      </section>

      <section className="popup-section">
        <form className="search-form" onSubmit={(e) => void handleQuickSearch(e)}>
          <input
            type="text"
            className="search-input"
            placeholder="병원명 또는 지역+진료과 빠른 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="모두닥 빠른 검색어"
          />
          <button type="submit" className="search-button">
            검색
          </button>
        </form>
      </section>

      <section className="popup-section history-section">
        <div className="section-head">
          <h2 className="section-title">
            최근 본 병원 · 비교함 <span className="count-pill">{recentHospitals.length}</span>
          </h2>
          {recentHospitals.length > 0 && (
            <button
              type="button"
              className="clear-all-button"
              onClick={() => {
                void handleClearAll();
              }}
            >
              전체 비우기
            </button>
          )}
        </div>

        {loading ? (
          <p className="empty-state">불러오는 중...</p>
        ) : recentHospitals.length === 0 ? (
          <div className="empty-state">
            <p>아직 확인한 병원이 없습니다.</p>
            <p className="empty-sub">네이버 지도에서 병원을 클릭하면 이곳에 기록됩니다.</p>
          </div>
        ) : (
          <ul className="history-list">
            {recentHospitals.map((item) => {
              const summary = item.summary;
              let repLabel: string | null = null;
              if (summary?.representativeTreatment && summary?.representativePrice) {
                repLabel = `${summary.representativeTreatment} ${summary.representativePrice}`;
              } else if (summary?.representativeTreatment) {
                repLabel = `#${summary.representativeTreatment}`;
              }

              return (
                <li key={item.id} className="history-item">
                  <button
                    type="button"
                    className="history-item-main"
                    onClick={() => {
                      void handleOpenHistoryItem(item);
                    }}
                  >
                    <div className="history-top-row">
                      <span className="history-name">{item.name}</span>
                      <span className="dept-badge">{item.department}</span>
                    </div>
                    <div className="history-meta-row">
                      <span>{item.regionHint || '지역 정보 없음'}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(item.viewedAt)}</span>
                      {item.clickedModoodoc && <span className="visited-pill">모두닥 열어봄</span>}
                    </div>
                    {summary !== null && (
                      <div className="history-summary-row">
                        {summary.totalScore !== null && (
                          <span className="summary-score">★ {summary.totalScore.toFixed(1)}</span>
                        )}
                        <span className="summary-reviews">
                          리뷰 {summary.reviewCount.toLocaleString('ko-KR')}건
                        </span>
                        {repLabel !== null && <span className="summary-treatment">{repLabel}</span>}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    className="delete-item-button"
                    aria-label={`${item.name} 기록 삭제`}
                    onClick={(e) => {
                      void handleRemoveItem(e, item.id);
                    }}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
