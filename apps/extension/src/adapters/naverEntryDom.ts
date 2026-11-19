import { evaluateMedicalCategory } from '../domain/medicalCategory';
import { extractRegionHintFromAddress, normalizeHospitalName } from '../domain/modoodocUrl';
import type { ExtractedHospitalPlace } from '../types/place';

const ENTRY_NAME_SELECTORS: readonly string[] = [
  '.WmLT9 .PbnXW',
  '#_title .GHAhO',
  '#_title .Fc1rA',
  '.zD5Nm .GHAhO',
  '.zD5Nm .Fc1rA',
  'h1#_header.bh9OH',
];

const ENTRY_CATEGORY_SELECTORS: readonly string[] = [
  '.HzrWS .mwWcl',
  '#_title .lnJFt',
  '#_title .DJJvD',
  '.zD5Nm .lnJFt',
  '.zD5Nm .DJJvD',
];

const ENTRY_ADDRESS_SELECTORS: readonly string[] = [
  '.O8qbU .pz7wy',
  '.vV_z_ .pz7wy',
  '.LDgIH',
  '.PkgBl',
  'span[class*="LDgIH"]',
];

const ENTRY_ANCHOR_SELECTORS: readonly string[] = ['.HzrWS', '.WmLT9', '#_title', '.zD5Nm'];

function queryFirstElement(root: ParentNode, selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const found = root.querySelector<HTMLElement>(selector);
    if (found?.textContent?.trim()) {
      return found;
    }
  }
  return null;
}

function isSearchListDocument(doc: Document): boolean {
  if (doc.querySelector('#_pcmap_list_scroll_container') !== null) {
    return true;
  }
  const pathname = doc.defaultView?.location?.pathname ?? '';
  return pathname.endsWith('/list');
}

/**
 * 네이버 지도 장소 상세 프레임(#entryIframe, pcmap.place.naver.com)에서 병원 정보를 파싱합니다.
 * 검색 목록 프레임이거나 의료기관이 아닌 경우, 또는 필수 요소가 없으면 null을 반환합니다.
 */
export function extractHospitalFromEntryDocument(doc: Document): ExtractedHospitalPlace | null {
  if (isSearchListDocument(doc)) {
    return null;
  }

  const nameEl = queryFirstElement(doc, ENTRY_NAME_SELECTORS);
  const categoryEl = queryFirstElement(doc, ENTRY_CATEGORY_SELECTORS);

  if (!nameEl || !categoryEl || nameEl === categoryEl) {
    return null;
  }

  const name = normalizeHospitalName(nameEl.textContent ?? '');
  const category = (categoryEl.textContent ?? '').trim();

  if (!name || !category) {
    return null;
  }

  const match = evaluateMedicalCategory(category, name);
  if (!match.isMedicalTarget || !match.matchedDepartment) {
    return null;
  }

  const addressEl = queryFirstElement(doc, ENTRY_ADDRESS_SELECTORS);
  const regionHint = addressEl?.textContent
    ? extractRegionHintFromAddress(addressEl.textContent)
    : '';

  const anchorCandidate = queryFirstElement(doc, ENTRY_ANCHOR_SELECTORS);
  const anchorElement =
    (anchorCandidate?.parentElement ? anchorCandidate : null) ?? nameEl.parentElement ?? nameEl;

  return {
    name,
    category,
    matchedDepartment: match.matchedDepartment,
    regionHint,
    anchorElement,
  };
}
