import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: '모두닥 리뷰 브릿지 for 네이버 지도',
    short_name: '모두닥 브릿지',
    description:
      '네이버 지도에서 병원을 클릭하면 모두닥의 실방문자 영수증 인증 리뷰 검색으로 즉시 연결합니다.',
    version: '0.1.0',
    // 최소 권한 원칙: 히스토리·토글 저장을 위한 storage 권한과 네이버 지도 호스트만 선언
    permissions: ['storage'],
    host_permissions: ['https://map.naver.com/*', 'https://pcmap.place.naver.com/*'],
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
