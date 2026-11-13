import type React from 'react';
import { buildModoodocSearchUrl } from '../domain/modoodocUrl';

export interface ModoodocListChipProps {
  readonly hospitalName: string;
  readonly regionHint: string;
  readonly isReviewed?: boolean;
  readonly detailUrl?: string | null;
  readonly onSelect?: () => void;
}

function stopBubble(event: React.SyntheticEvent): void {
  event.stopPropagation();
}

export function ModoodocListChip({
  hospitalName,
  regionHint,
  isReviewed = false,
  detailUrl = null,
  onSelect,
}: ModoodocListChipProps): React.JSX.Element {
  const targetUrl = detailUrl ?? buildModoodocSearchUrl(hospitalName, regionHint);

  return (
    <div className="modoodoc-list-chip-wrapper">
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`modoodoc-list-chip${isReviewed ? ' is-reviewed' : ''}`}
        title={`'${hospitalName}' 모두닥 ${isReviewed ? '상세 리뷰 바로 보기' : '리뷰 바로 보기'} (새 탭)`}
        aria-label={`${hospitalName} 모두닥 리뷰 보기`}
        onPointerDown={stopBubble}
        onMouseDown={stopBubble}
        onClick={(event) => {
          event.stopPropagation();
          onSelect?.();
        }}
      >
        {isReviewed ? (
          <span className="modoodoc-list-chip-check" aria-hidden="true">
            ✓
          </span>
        ) : (
          <span className="modoodoc-list-chip-dot" aria-hidden="true" />
        )}
        <span className="modoodoc-list-chip-label">
          {isReviewed ? '리뷰 확인함' : '모두닥 리뷰'}
        </span>
        <span className="modoodoc-list-chip-arrow" aria-hidden="true">
          ↗
        </span>
      </a>
    </div>
  );
}
