import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  BRIDGE_ENABLED_KEY,
  getBridgeState,
  RECENT_HOSPITALS_KEY,
  setBridgeEnabled,
} from '../../domain/bridgeStorage';
import {
  clearRecentHospitalsViaWorker,
  markHospitalClickedViaWorker,
  removeRecentHospitalViaWorker,
} from '../../domain/historyGateway';
import { buildModoodocSearchUrl } from '../../domain/modoodocUrl';
import { WEB_APP_URL } from '../../domain/serviceUrls';
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
  const [showPinTip, setShowPinTip] = useState<boolean>(false);

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
      if (BRIDGE_ENABLED_KEY in changes || RECENT_HOSPITALS_KEY in changes) {
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
          <img
            src="/brand/medi-bridge-symbol.png"
            alt="메디 브릿지 심볼"
            className="popup-symbol"
          />
          <div className="popup-wordmarks">
            <img
              src="/brand/medi-bridge-wordmark-en.png"
              alt="MEDI BRIDGE"
              className="popup-wordmark-en"
            />
            <p className="popup-subtitle">통합 비급여·이벤트 가격 비교</p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={bridgeEnabled}
          aria-label="네이버 지도 내 메디 브릿지 자동 표시"
          className={`toggle-switch ${bridgeEnabled ? 'is-on' : 'is-off'}`}
          onClick={() => {
            void handleToggle();
          }}
        >
          <span className="toggle-thumb" />
        </button>
      </header>

      <section className="popup-status-banner">
        <div className="status-left">
          <span className={`status-dot ${bridgeEnabled ? 'is-active' : 'is-paused'}`} />
          <span className="status-text">
            {bridgeEnabled
              ? '네이버 지도 실시간 병원 가격·리뷰 연동 중'
              : '지도 오버레이 일시 중지됨'}
          </span>
        </div>
      </section>

      <section className="popup-section">
        <form className="search-form" onSubmit={(e) => void handleQuickSearch(e)}>
          <input
            type="text"
            className="search-input"
            placeholder="병원명 또는 시술명 빠른 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="메디 브릿지 빠른 검색어"
          />
          <button type="submit" className="search-button">
            검색
          </button>
        </form>
      </section>

      <section className="popup-section history-section">
        <div className="section-head">
          <h2 className="section-title">
            최근 비교 병원 <span className="count-pill">{recentHospitals.length}</span>
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
            <p>아직 비교한 병원이 없습니다.</p>
            <p className="empty-sub">네이버 지도에서 병원을 선택하면 이곳에 정리됩니다.</p>
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
                      {item.clickedModoodoc && <span className="visited-pill">상세 열람함</span>}
                    </div>
                    {summary !== null && (
                      <div className="history-summary-row">
                        {summary.platformLabel && (
                          <span className="platform-mini">{summary.platformLabel}</span>
                        )}
                        {summary.totalScore !== null && (
                          <span className="summary-score">★ {summary.totalScore.toFixed(1)}</span>
                        )}
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

      <footer className="popup-footer">
        <button
          type="button"
          className="web-link-button"
          onClick={() => {
            void openExternalTab(WEB_APP_URL);
          }}
        >
          확장프로그램 안내 ↗
        </button>
        <button
          type="button"
          className="pin-tip-toggle"
          onClick={() => setShowPinTip((prev) => !prev)}
        >
          {showPinTip ? '고정 안내 닫기' : '툴바 고정 팁'}
        </button>
      </footer>

      {showPinTip && (
        <p className="pin-tip-box">
          우측 상단 퍼즐 아이콘을 눌러 메디 브릿지를 고정하면 활성(세이지 그린)/일시정지(그레이)
          아이콘 상태를 바로 볼 수 있습니다.
        </p>
      )}
    </div>
  );
}
