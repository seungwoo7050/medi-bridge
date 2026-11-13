export interface ExtractedHospitalPlace {
  /** 네이버 지도 장소 상세 패널에서 추출된 병원명 */
  readonly name: string;
  /** 네이버 지도 카테고리 텍스트 (예: '치과의원', '피부과,레이저') */
  readonly category: string;
  /** 매칭된 대표 진료과 키워드 (예: '치과', '피부과') */
  readonly matchedDepartment: string;
  /** 검색 정확도 향상을 위한 시/구/동 단위 축약 지역명 (없으면 빈 문자열) */
  readonly regionHint: string;
  /** 배지 UI를 마운트할 기준 DOM 요소 */
  readonly anchorElement: HTMLElement;
}

export interface ExtractedSearchListHospital {
  /** DOM 목록 내 중복 마운트 방지 및 식별용 정규화 키 */
  readonly itemKey: string;
  /** 검색 목록 행에서 추출된 병원명 */
  readonly name: string;
  /** 검색 목록 행 카테고리 텍스트 */
  readonly category: string;
  /** 매칭된 대표 진료과 키워드 */
  readonly matchedDepartment: string;
  /** 검색 목록 행에서 추출된 축약 지역 힌트 (없으면 빈 문자열) */
  readonly regionHint: string;
  /** 미니 버튼을 인라인 마운트할 기준 요소 */
  readonly anchorElement: HTMLElement;
  /** 검색 목록 아이템 루트 요소 (DOM 제거 감지용) */
  readonly itemElement: HTMLElement;
}

export interface CategoryMatchResult {
  readonly isMedicalTarget: boolean;
  readonly matchedDepartment: string | null;
}

export interface RecentHospitalRecord {
  readonly id: string;
  readonly name: string;
  readonly department: string;
  readonly regionHint: string;
  readonly searchUrl: string;
  readonly viewedAt: number;
  readonly clickedModoodoc: boolean;
}

export interface BridgeStorageState {
  readonly bridgeEnabled: boolean;
  readonly recentHospitals: readonly RecentHospitalRecord[];
}
