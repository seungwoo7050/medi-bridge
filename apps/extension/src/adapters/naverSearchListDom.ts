import { evaluateMedicalCategory } from '../domain/medicalCategory';
import {
  buildHospitalKey,
  extractRegionHintFromAddress,
  normalizeHospitalName,
} from '../domain/modoodocUrl';
import type { ExtractedSearchListHospital } from '../types/place';

const LIST_ITEM_SELECTOR = '#_pcmap_list_scroll_container ul > li, ul > li.DWs4Q';

const LIST_NAME_SELECTORS: readonly string[] = [
  '.uMPdj .q2LdB',
  '.place_bluelink .TYaxT',
  '.place_bluelink .YwYLL',
];

const LIST_CATEGORY_SELECTORS: readonly string[] = ['.uMPdj .lHBM6', '.KCMnt', '.YzBgS'];

const LIST_REGION_SELECTORS: readonly string[] = ['.suKMR', '.Pb4bU', '.hClKF'];

function queryFirstElement(root: ParentNode, selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const found = root.querySelector<HTMLElement>(selector);
    if (found?.textContent?.trim()) {
      return found;
    }
  }
  return null;
}

function isHospitalSearchContext(doc: Document, itemEl: HTMLElement): boolean {
  if (itemEl.querySelector('[data-nlog-params*="\\"item_name\\":\\"hospital\\""]') !== null) {
    return true;
  }
  const pathname = doc.defaultView?.location?.pathname ?? '';
  return pathname.includes('/hospital/');
}

function resolveAdFallbackCategory(
  doc: Document,
  itemEl: HTMLElement,
  hospitalName: string,
): string {
  if (!isHospitalSearchContext(doc, itemEl)) {
    return '';
  }

  const badgeTexts = Array.from(itemEl.querySelectorAll<HTMLElement>('.wt0BA .D1dXu'))
    .map((el) => el.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(' ');

  return badgeTexts || hospitalName;
}

/**
 * 네이버 지도 좌측 검색 결과 목록(#searchIframe)에서 의료기관 행만 추출합니다.
 * 광고성 병원 행(.lHBM6 생략)도 병원 컨텍스트가 확인되면 안전하게 처리하며,
 * 동물병원·약국·카페 등 비대상 업종은 제외합니다.
 */
export function extractHospitalsFromSearchList(doc: Document): ExtractedSearchListHospital[] {
  const listItems = doc.querySelectorAll<HTMLElement>(LIST_ITEM_SELECTOR);
  const extracted: ExtractedSearchListHospital[] = [];

  for (const itemEl of listItems) {
    const nameEl = queryFirstElement(itemEl, LIST_NAME_SELECTORS);
    if (!nameEl) {
      continue;
    }

    const name = normalizeHospitalName(nameEl.textContent ?? '');
    if (!name) {
      continue;
    }

    const categoryEl = queryFirstElement(itemEl, LIST_CATEGORY_SELECTORS);
    const rawCategory =
      categoryEl?.textContent?.trim() || resolveAdFallbackCategory(doc, itemEl, name);

    if (!rawCategory) {
      continue;
    }

    const match = evaluateMedicalCategory(rawCategory, name);
    if (!match.isMedicalTarget || !match.matchedDepartment) {
      continue;
    }

    const regionEl = queryFirstElement(itemEl, LIST_REGION_SELECTORS);
    const regionHint = regionEl?.textContent
      ? extractRegionHintFromAddress(regionEl.textContent)
      : '';

    const anchorElement =
      itemEl.querySelector<HTMLElement>('.uMPdj') ?? nameEl.parentElement ?? itemEl;

    extracted.push({
      itemKey: buildHospitalKey(name, regionHint),
      name,
      category: rawCategory,
      matchedDepartment: match.matchedDepartment,
      regionHint,
      anchorElement,
      itemElement: itemEl,
    });
  }

  return extracted;
}
