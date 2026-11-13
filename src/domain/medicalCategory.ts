import type { CategoryMatchResult } from '../types/place';

/**
 * 모두닥 핵심 타겟 진료과 및 의원/병원급 키워드 목록
 */
export const TARGET_MEDICAL_KEYWORDS: readonly string[] = [
  '치과',
  '피부과',
  '안과',
  '성형외과',
  '정형외과',
  '산부인과',
  '비뇨의학과',
  '비뇨기과',
  '이비인후과',
  '내과',
  '소아청소년과',
  '소아과',
  '정신건강의학과',
  '신경외과',
  '신경과',
  '재활의학과',
  '마취통증의학과',
  '통증의학과',
  '가정의학과',
  '영상의학과',
  '외과',
  '흉부외과',
  '한의원',
  '한방병원',
  '의원',
  '병원',
  '클리닉',
] as const;

/**
 * 병원 키워드('병원', '의원', '피부' 등)를 포함하더라도 모두닥 대상이 아닌 제외 키워드
 * (반드시 포함 키워드보다 먼저 평가해야 '동물병원', '요양병원', '피부관리' 등의 오탐을 막을 수 있음)
 */
export const EXCLUDED_NON_TARGET_KEYWORDS: readonly string[] = [
  '동물병원',
  '동물메디컬',
  '수의과',
  '약국',
  '한약방',
  '산후조리원',
  '요양원',
  '요양병원',
  '장례식장',
  '의료기기',
  '안경원',
  '보건소',
  '보건지소',
  '헌혈의집',
  '치기공',
  '피부관리',
  '에스테틱',
  '마사지',
  '네일',
] as const;

/**
 * 네이버 지도 장소 카테고리 및 장소명을 기반으로 모두닥 배지 노출 대상인지 판별합니다.
 */
export function evaluateMedicalCategory(rawCategory: string, placeName = ''): CategoryMatchResult {
  const normalizedCategory = rawCategory.trim();
  const combined = `${normalizedCategory} ${placeName.trim()}`;

  if (normalizedCategory.length === 0) {
    return { isMedicalTarget: false, matchedDepartment: null };
  }

  for (const excluded of EXCLUDED_NON_TARGET_KEYWORDS) {
    if (combined.includes(excluded)) {
      return { isMedicalTarget: false, matchedDepartment: null };
    }
  }

  for (const keyword of TARGET_MEDICAL_KEYWORDS) {
    if (normalizedCategory.includes(keyword)) {
      return { isMedicalTarget: true, matchedDepartment: keyword };
    }
  }

  return { isMedicalTarget: false, matchedDepartment: null };
}
