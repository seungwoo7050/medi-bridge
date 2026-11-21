import type { StandardTreatment, TreatmentCategory } from './schemas';

export const STANDARD_TREATMENTS: readonly StandardTreatment[] = [
  {
    code: 'OPHTH_SMILE',
    category: '안과',
    label: '스마일라식',
    unitLabel: '양안',
    aliases: ['스마일라식', '스마일프로', '스마일', 'smile'],
  },
  {
    code: 'OPHTH_LASEK',
    category: '안과',
    label: '투데이라섹 · 라섹',
    unitLabel: '양안',
    aliases: ['라섹', '투데이라섹', '올레이저라섹', 'lasek'],
  },
  {
    code: 'DENT_IMPLANT',
    category: '치과',
    label: '국산 임플란트',
    unitLabel: '1치',
    aliases: ['임플란트', '오스템', '덴티움', '디오임플란트', 'implant'],
  },
  {
    code: 'DENT_SCALING',
    category: '치과',
    label: '치아미백 · 스케일링',
    unitLabel: '1회',
    aliases: ['스케일링', '치아미백', '미백', '크라운'],
  },
  {
    code: 'DERM_INMODE',
    category: '피부과',
    label: '인모드 FX',
    unitLabel: '풀페이스 1회',
    aliases: ['인모드', 'inmode', 'fx', 'forma'],
  },
  {
    code: 'DERM_ULTHERA',
    category: '피부과',
    label: '울쎄라 리프팅',
    unitLabel: '300샷',
    aliases: ['울쎄라', '슈링크', '써마지', '올리지오', '리프테라', '덴서티', '리프팅'],
  },
  {
    code: 'DERM_SKINBOOSTER',
    category: '피부과',
    label: '리쥬란 · 스킨부스터',
    unitLabel: '1회',
    aliases: ['리쥬란', '쥬베룩', '스킨부스터', '물광주사', '엑소좀'],
  },
  {
    code: 'DERM_TONING',
    category: '피부과',
    label: '피코토닝 · 레이저',
    unitLabel: '1회',
    aliases: ['피코토닝', '레이저토닝', '피코플러스', '포텐자'],
  },
  {
    code: 'ORTHO_MANUAL',
    category: '정형외과',
    label: '도수치료',
    unitLabel: '1회',
    aliases: ['도수치료', '체외충격파', '재활치료', '물리치료'],
  },
  {
    code: 'ORTHO_PROLO',
    category: '정형외과',
    label: '프롤로 주사',
    unitLabel: '1부위',
    aliases: ['프롤로', '인대강화', '증식치료', '관절주사'],
  },
  {
    code: 'PLASTIC_BOTOX',
    category: '성형외과',
    label: '사각턱 보톡스',
    unitLabel: '50U',
    aliases: ['보톡스', '사각턱', '스킨보톡스', '제오민', '코어톡스', '필러'],
  },
];

const VAT_EXCLUDED_PATTERN = /(?:vat|부가세)\s*(?:별도|제외|미포함)/i;
const VAT_INCLUDED_PATTERN = /(?:vat|부가세)\s*(?:포함)/i;

/**
 * 플랫폼별 제각각인 이벤트 상품명에서 표준 시술 코드와 VAT 포함 여부를 추출합니다.
 */
export function detectVatIncluded(rawTitle: string, fallback = true): boolean {
  if (VAT_EXCLUDED_PATTERN.test(rawTitle)) {
    return false;
  }
  if (VAT_INCLUDED_PATTERN.test(rawTitle)) {
    return true;
  }
  return fallback;
}

export function classifyTreatmentName(
  rawTitle: string,
  categoryHint?: TreatmentCategory,
): StandardTreatment {
  const lowered = rawTitle.toLowerCase().replace(/\s+/g, '');

  for (const item of STANDARD_TREATMENTS) {
    if (categoryHint && categoryHint !== '기타' && item.category !== categoryHint) {
      continue;
    }
    for (const alias of item.aliases) {
      if (lowered.includes(alias.toLowerCase())) {
        return item;
      }
    }
  }

  for (const item of STANDARD_TREATMENTS) {
    for (const alias of item.aliases) {
      if (lowered.includes(alias.toLowerCase())) {
        return item;
      }
    }
  }

  const fallbackCategory = categoryHint ?? '기타';
  return {
    code: `CUSTOM_${fallbackCategory}`,
    category: fallbackCategory,
    label: rawTitle.trim() || '기타 비급여 시술',
    unitLabel: '1회',
    aliases: [],
  };
}
