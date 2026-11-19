import { describe, expect, it } from 'vitest';
import { evaluateMedicalCategory } from '../src/domain/medicalCategory';

describe('evaluateMedicalCategory', () => {
  it('모두닥 핵심 진료과(치과, 피부과, 안과, 정형외과, 한의원 등)를 정확히 허용한다', () => {
    expect(evaluateMedicalCategory('치과의원')).toEqual({
      isMedicalTarget: true,
      matchedDepartment: '치과',
    });
    expect(evaluateMedicalCategory('피부과')).toEqual({
      isMedicalTarget: true,
      matchedDepartment: '피부과',
    });
    expect(evaluateMedicalCategory('정형외과의원')).toEqual({
      isMedicalTarget: true,
      matchedDepartment: '정형외과',
    });
    expect(evaluateMedicalCategory('한의원')).toEqual({
      isMedicalTarget: true,
      matchedDepartment: '한의원',
    });
    expect(evaluateMedicalCategory('안과,시력교정')).toEqual({
      isMedicalTarget: true,
      matchedDepartment: '안과',
    });
  });

  it('동물병원, 약국, 요양병원, 피부관리 등 비대상 업종은 병원/진료과 키워드가 포함돼도 차단한다', () => {
    expect(evaluateMedicalCategory('동물병원', '24시센트럴동물병원').isMedicalTarget).toBe(false);
    expect(evaluateMedicalCategory('약국', '온누리약국').isMedicalTarget).toBe(false);
    expect(evaluateMedicalCategory('요양병원', '효자요양병원').isMedicalTarget).toBe(false);
    expect(evaluateMedicalCategory('산후조리원', '드라마산후조리원').isMedicalTarget).toBe(false);
    expect(evaluateMedicalCategory('피부관리,체형관리', '벨라피부관리실').isMedicalTarget).toBe(
      false,
    );
    expect(evaluateMedicalCategory('안경원', '다비치안경').isMedicalTarget).toBe(false);
  });

  it('식당, 카페 등 일반 상점과 빈 카테고리는 차단한다', () => {
    expect(evaluateMedicalCategory('카페,디저트', '스타벅스 강남역점').isMedicalTarget).toBe(false);
    expect(evaluateMedicalCategory('육류,고기요리', '숙달돼지').isMedicalTarget).toBe(false);
    expect(evaluateMedicalCategory('   ', '강남안과').isMedicalTarget).toBe(false);
  });
});
