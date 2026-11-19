import type React from 'react';
import { CATEGORY_PIN_ACCENTS, type ClinicCategoryPinKind, MEDICAL_BENTO_COLORS } from './tokens';

export interface IconBadgeProps {
  readonly size?: number;
  readonly className?: string;
}

export function BrandInfinityIcon({ size = 16, className }: IconBadgeProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.56)}
      viewBox="0 0 36 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <title>메디 브릿지 인피니티 심볼</title>
      <path
        d="M11.2 15.8C7.7 15.8 4.8 13.2 4.8 10C4.8 6.8 7.7 4.2 11.2 4.2C14.3 4.2 16.3 6.5 18 10C19.7 13.5 21.7 15.8 24.8 15.8C28.3 15.8 31.2 13.2 31.2 10C31.2 6.8 28.3 4.2 24.8 4.2C22.4 4.2 20.6 5.4 19.3 7.5"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M18 10C19.7 13.5 21.7 15.8 24.8 15.8C28.3 15.8 31.2 13.2 31.2 10C31.2 6.8 28.3 4.2 24.8 4.2"
        stroke={MEDICAL_BENTO_COLORS.softSage}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HiraVerifiedBadge({
  compact = false,
}: {
  readonly compact?: boolean;
}): React.JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: compact ? '2px 6px' : '3px 8px',
        borderRadius: '9999px',
        backgroundColor: MEDICAL_BENTO_COLORS.indigoMuted,
        border: `1px solid ${MEDICAL_BENTO_COLORS.indigoBorder}`,
        color: MEDICAL_BENTO_COLORS.deepIndigo,
        fontSize: compact ? '10px' : '11px',
        fontWeight: 700,
        lineHeight: '14px',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <title>심평원 대조 완료</title>
        <path
          d="M8 1.5L2.5 3.8V7.6C2.5 11.1 4.8 13.9 8 14.8C11.2 13.9 13.5 11.1 13.5 7.6V3.8L8 1.5Z"
          fill={MEDICAL_BENTO_COLORS.deepIndigo}
        />
        <path
          d="M5.6 8.1L7.3 9.8L10.6 6.3"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>심평원 대조</span>
    </span>
  );
}

export function BestPriceBadge({
  label = '최저가 인증',
}: {
  readonly label?: string;
}): React.JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 7px',
        borderRadius: '9999px',
        backgroundColor: MEDICAL_BENTO_COLORS.sageSurface,
        border: `1px solid ${MEDICAL_BENTO_COLORS.sageBorder}`,
        color: MEDICAL_BENTO_COLORS.sageAccent,
        fontSize: '10.5px',
        fontWeight: 700,
        lineHeight: '14px',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <title>최저가</title>
        <circle cx="8" cy="8" r="6.5" fill={MEDICAL_BENTO_COLORS.sageAccent} />
        <path
          d="M5.4 8.2L7.1 9.9L10.7 6.2"
          stroke="#FFFFFF"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label}</span>
    </span>
  );
}

export function CategoryPinIcon({
  category,
  size = 24,
}: {
  readonly category: string;
  readonly size?: number;
}): React.JSX.Element {
  const kind: ClinicCategoryPinKind =
    category in CATEGORY_PIN_ACCENTS ? (category as ClinicCategoryPinKind) : '기타';
  const accent = CATEGORY_PIN_ACCENTS[kind];

  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <title>{kind} 마커</title>
      <path
        d="M14 2C8.75 2 4.5 6.25 4.5 11.5C4.5 18.2 14 26 14 26C14 26 23.5 18.2 23.5 11.5C23.5 6.25 19.25 2 14 2Z"
        fill={accent}
      />
      <circle cx="14" cy="11.5" r="4.5" fill="#FFFFFF" />
      <circle cx="14" cy="11.5" r="2.2" fill={MEDICAL_BENTO_COLORS.softSage} />
    </svg>
  );
}

export function EmptySearchGraphic(): React.JSX.Element {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <title>조회 결과 없음</title>
      <circle
        cx="25"
        cy="25"
        r="15"
        fill={MEDICAL_BENTO_COLORS.indigoMuted}
        stroke={MEDICAL_BENTO_COLORS.deepIndigo}
        strokeWidth="2.5"
      />
      <path
        d="M36 36L46 46"
        stroke={MEDICAL_BENTO_COLORS.deepIndigo}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M20 25H30M25 20V30"
        stroke={MEDICAL_BENTO_COLORS.sageAccent}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ToolbarPinGuideGraphic(): React.JSX.Element {
  return (
    <svg width="180" height="44" viewBox="0 0 180 44" fill="none" aria-hidden="true">
      <title>브라우저 툴바 고정 안내</title>
      <rect
        x="1"
        y="1"
        width="178"
        height="42"
        rx="10"
        fill={MEDICAL_BENTO_COLORS.indigoMuted}
        stroke={MEDICAL_BENTO_COLORS.indigoBorder}
      />
      <circle cx="24" cy="22" r="10" fill={MEDICAL_BENTO_COLORS.deepIndigo} />
      <path d="M18 22H30" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <rect
        x="44"
        y="12"
        width="84"
        height="20"
        rx="6"
        fill="#FFFFFF"
        stroke={MEDICAL_BENTO_COLORS.indigoBorder}
      />
      <circle
        cx="148"
        cy="22"
        r="10"
        fill={MEDICAL_BENTO_COLORS.sageSurface}
        stroke={MEDICAL_BENTO_COLORS.sageBorder}
      />
      <path
        d="M148 16V28M144 20H152"
        stroke={MEDICAL_BENTO_COLORS.sageAccent}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
