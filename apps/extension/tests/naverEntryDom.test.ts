import { describe, expect, it } from 'vitest';
import { extractHospitalFromEntryDocument } from '../src/adapters/naverEntryDom';

describe('extractHospitalFromEntryDocument', () => {
  it('2026 라이브 네이버 지도 상세 패널(.WmLT9/.HzrWS/.O8qbU)에서 병원 정보를 추출한다', () => {
    document.body.innerHTML = `
      <div role="main">
        <div class="place_section no_margin OP4V8 xtZml" data-nclicks-area-code="btp">
          <div class="WmLT9"><span class="PbnXW">강남케이안과의원</span></div>
          <div>
            <div class="HzrWS">
              <span class="mwWcl">안과</span>
              <span class="mwWcl"><a href="/hospital/1399571178/review/visitor">리뷰 307</a></span>
            </div>
          </div>
        </div>
        <div class="place_section no_margin">
          <div class="O8qbU tQY7D">
            <div class="vV_z_">
              <span class="pz7wy">서울 강남구 강남대로 374 13층</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const extracted = extractHospitalFromEntryDocument(document);
    expect(extracted).not.toBeNull();
    expect(extracted?.name).toBe('강남케이안과의원');
    expect(extracted?.category).toBe('안과');
    expect(extracted?.matchedDepartment).toBe('안과');
    expect(extracted?.regionHint).toBe('서울 강남구');
    expect(extracted?.anchorElement.className).toContain('HzrWS');
  });

  it('레거시 네이버 지도 상세 패널(#_title/.LDgIH) 폴백 셀렉터도 정상 동작한다', () => {
    document.body.innerHTML = `
      <div id="_title">
        <span class="GHAhO">서울바른피부과의원</span>
        <span class="lnJFt">피부과</span>
      </div>
      <div class="place_section_content">
        <span class="LDgIH">서울 서초구 강남대로 405 통영빌딩 5층</span>
      </div>
    `;

    const extracted = extractHospitalFromEntryDocument(document);
    expect(extracted).not.toBeNull();
    expect(extracted?.name).toBe('서울바른피부과의원');
    expect(extracted?.matchedDepartment).toBe('피부과');
    expect(extracted?.regionHint).toBe('서울 서초구');
  });

  it('검색 목록 컨테이너(#_pcmap_list_scroll_container) 문서에서는 null을 반환한다', () => {
    document.body.innerHTML = `
      <div id="_pcmap_list_scroll_container">
        <ul>
          <li class="DWs4Q">
            <div class="WmLT9"><span class="PbnXW">강남케이안과의원</span></div>
            <div class="HzrWS"><span class="mwWcl">안과</span></div>
          </li>
        </ul>
      </div>
    `;

    expect(extractHospitalFromEntryDocument(document)).toBeNull();
  });

  it('식당/카페 및 동물병원 상세 패널은 차단한다', () => {
    document.body.innerHTML = `
      <div class="place_section OP4V8">
        <div class="WmLT9"><span class="PbnXW">블루보틀 역삼카페</span></div>
        <div class="HzrWS"><span class="mwWcl">카페,디저트</span></div>
      </div>
    `;
    expect(extractHospitalFromEntryDocument(document)).toBeNull();

    document.body.innerHTML = `
      <div class="place_section OP4V8">
        <div class="WmLT9"><span class="PbnXW">24시센트럴동물병원</span></div>
        <div class="HzrWS"><span class="mwWcl">동물병원</span></div>
      </div>
    `;
    expect(extractHospitalFromEntryDocument(document)).toBeNull();
  });
});
