import type React from 'react';
import { buildModoodocSearchUrl } from '../domain/modoodocUrl';

export interface ModoodocBadgeProps {
  readonly hospitalName: string;
  readonly regionHint: string;
  readonly onSelect?: () => void;
}

export function ModoodocBadge({
  hospitalName,
  regionHint,
  onSelect,
}: ModoodocBadgeProps): React.JSX.Element {
  const targetUrl = buildModoodocSearchUrl(hospitalName, regionHint);

  return (
    <div className="modoodoc-bridge-wrapper">
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="modoodoc-bridge-badge"
        title={`'${hospitalName}' 모두닥 실방문자 영수증 리뷰 검색 (새 탭)`}
        aria-label={`${hospitalName} 모두닥 영수증 리뷰 보기`}
        onClick={() => {
          onSelect?.();
        }}
      >
        <span className="modoodoc-bridge-icon" aria-hidden="true">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <title>모두닥 아이콘</title>
            <path
              d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8C1.5 11.59 4.41 14.5 8 14.5C11.59 14.5 14.5 11.59 14.5 8C14.5 4.41 11.59 1.5 8 1.5ZM7.25 4.5H8.75V7.25H11.5V8.75H8.75V11.5H7.25V8.75H4.5V7.25H7.25V4.5Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="modoodoc-bridge-label">모두닥 영수증 리뷰 보기</span>
        <span className="modoodoc-bridge-arrow" aria-hidden="true">
          ↗
        </span>
      </a>
    </div>
  );
}
