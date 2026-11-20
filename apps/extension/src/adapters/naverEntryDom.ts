import {
  evaluateMedicalCategory,
  extractRegionHintFromAddress,
  normalizeHospitalName,
  parseAddressTokens,
} from '@medi-bridge/shared';
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
  '.o3Ae6 .pz7wy',
  '.O8qbU .pz7wy',
  '.vV_z_ .pz7wy',
  '.pz7wy',
  '.LDgIH',
  '.PkgBl',
  'span[class*="LDgIH"]',
];

const ENTRY_ANCHOR_SELECTORS: readonly string[] = [
  '.HzrWS',
  '.WmLT9',
  '#_title',
  '.zD5Nm',
  '.place_fixed_maintab',
  '[role="tablist"]',
];

function isHospitalDetailDocument(doc: Document): boolean {
  const pathname = doc.defaultView?.location?.pathname ?? '';
  return pathname.startsWith('/hospital/');
}

function isSubTabEntryDocument(doc: Document): boolean {
  const pathname = doc.defaultView?.location?.pathname ?? '';
  return /^\/(?:hospital|place)\/[^/]+\/(?!home(?:\/|$))[^/]+/.test(pathname);
}

function resolveSubTabAnchor(doc: Document): HTMLElement | null {
  const maintab = doc.querySelector<HTMLElement>('.place_fixed_maintab');
  if (maintab) {
    let cursor = maintab.nextElementSibling;
    if (cursor?.tagName.toLowerCase() === 'medi-bridge-entry-card') {
      cursor = cursor.nextElementSibling;
    }
    if (
      cursor instanceof HTMLElement &&
      cursor.children.length === 0 &&
      !(cursor.textContent ?? '').trim()
    ) {
      return cursor;
    }
    return maintab;
  }
  return doc.querySelector<HTMLElement>('[role="tablist"]');
}

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

function extractMetaRegionFallback(doc: Document): string {
  const metaContent =
    doc
      .querySelector<HTMLMetaElement>('meta[property="og:description"]')
      ?.getAttribute('content') ?? '';
  if (!metaContent) {
    return '';
  }
  const candidate = extractRegionHintFromAddress(metaContent);
  if (!candidate) {
    return '';
  }
  const parsed = parseAddressTokens(candidate);
  return parsed.sido || parsed.sigungu ? candidate : '';
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
  if (!nameEl) {
    return null;
  }

  const name = normalizeHospitalName(nameEl.textContent ?? '');
  if (!name) {
    return null;
  }

  const categoryEl = queryFirstElement(doc, ENTRY_CATEGORY_SELECTORS);
  if (categoryEl === nameEl) {
    return null;
  }

  const rawCategory = (categoryEl?.textContent ?? '').trim();
  const category = rawCategory || (isHospitalDetailDocument(doc) ? `${name} 의원` : '');
  if (!category) {
    return null;
  }

  const match = evaluateMedicalCategory(category, name);
  if (!match.isMedicalTarget || !match.matchedDepartment) {
    return null;
  }

  const addressEl = queryFirstElement(doc, ENTRY_ADDRESS_SELECTORS);
  const regionHint = addressEl?.textContent
    ? extractRegionHintFromAddress(addressEl.textContent)
    : extractMetaRegionFallback(doc);

  const isSubTab = isSubTabEntryDocument(doc);
  const anchorCandidate = isSubTab
    ? (resolveSubTabAnchor(doc) ?? queryFirstElement(doc, ENTRY_ANCHOR_SELECTORS))
    : queryFirstElement(doc, ENTRY_ANCHOR_SELECTORS);
  const anchorElement =
    (anchorCandidate?.parentElement ? anchorCandidate : null) ?? nameEl.parentElement ?? nameEl;

  return {
    name,
    category,
    matchedDepartment: match.matchedDepartment,
    regionHint,
    anchorElement,
    isSubTab,
  };
}
