import { describe, expect, it } from 'vitest';
import { extractHospitalsFromSearchList } from '../src/adapters/naverSearchListDom';

describe('extractHospitalsFromSearchList', () => {
  it('검색 목록의 일반 병원, 병원 광고 행은 추출하고 카페·동물병원은 제외한다', () => {
    document.body.innerHTML = `
      <div id="_pcmap_list_scroll_container">
        <ul>
          <li class="DWs4Q z23xh">
            <div class="IPtqD">
              <div class="uMPdj">
                <a href="#" class="uD1F4 gADnZ" data-nlog-params='{"item_type":"place_type","item_name":"hospital"}'>
                  <span class="q2LdB">지에스안과의원</span>
                </a>
              </div>
              <div class="_XGt_"><span class="suKMR">서울 강남구 역삼동</span></div>
              <div class="wt0BA">
                <a href="#" class="KJzzB"><span class="D1dXu">전문의</span><span class="D1dXu">안과 7명</span></a>
              </div>
            </div>
          </li>
          <li class="DWs4Q z23xh">
            <div class="IPtqD">
              <div class="uMPdj">
                <a href="#" class="uD1F4 gADnZ">
                  <span class="q2LdB">강남케이안과의원</span>
                  <span class="lHBM6">안과</span>
                </a>
              </div>
              <div class="_XGt_"><span class="suKMR">서울 강남구 역삼동</span></div>
            </div>
          </li>
          <li class="DWs4Q z23xh">
            <div class="IPtqD">
              <div class="uMPdj">
                <a href="#" class="uD1F4 gADnZ">
                  <span class="q2LdB">24시센트럴동물병원</span>
                  <span class="lHBM6">동물병원</span>
                </a>
              </div>
              <div class="_XGt_"><span class="suKMR">서울 강남구 논현동</span></div>
            </div>
          </li>
          <li class="DWs4Q z23xh">
            <div class="IPtqD">
              <div class="uMPdj">
                <a href="#" class="uD1F4 gADnZ">
                  <span class="q2LdB">스타벅스 강남역점</span>
                  <span class="lHBM6">카페,디저트</span>
                </a>
              </div>
              <div class="_XGt_"><span class="suKMR">서울 서초구 서초동</span></div>
            </div>
          </li>
        </ul>
      </div>
    `;

    const results = extractHospitalsFromSearchList(document);
    expect(results).toHaveLength(2);
    expect(results[0]?.name).toBe('지에스안과의원');
    expect(results[0]?.matchedDepartment).toBe('안과');
    expect(results[0]?.regionHint).toBe('서울 강남구');
    expect(results[0]?.anchorElement.className).toBe('uMPdj');

    expect(results[1]?.name).toBe('강남케이안과의원');
    expect(results[1]?.matchedDepartment).toBe('안과');
    expect(results[1]?.regionHint).toBe('서울 강남구');
  });
});
