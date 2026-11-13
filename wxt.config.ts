import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  // 크롬 확장프로그램 로드 선택기에서 숨김 폴더(.output)가 보이지 않는 문제를 방지하기 위해 일반 폴더명 사용
  outDir: 'output',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: '모두닥 리뷰 브릿지 for 네이버 지도',
    short_name: '모두닥 브릿지',
    description:
      '네이버 지도에서 병원의 모두닥 비급여·특가 시술 가격을 미리 확인하고 영수증 인증 리뷰로 바로 이동합니다.',
    version: '0.2.0',
    // 최소 권한 원칙: 히스토리·토글 저장을 위한 storage 권한과 네이버 지도·모두닥 호스트만 선언
    permissions: ['storage'],
    host_permissions: [
      'https://map.naver.com/*',
      'https://pcmap.place.naver.com/*',
      'https://www.modoodoc.com/*',
    ],
    action: {
      default_title: '모두닥 리뷰 브릿지',
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
  },
});
