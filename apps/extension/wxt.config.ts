import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const PRODUCTION_WEB_ORIGIN = (
  process.env.WXT_PUBLIC_WEB_URL || 'https://medi-bridge.seungwoo7050.workers.dev'
).replace(/\/+$/, '');

export default defineConfig({
  srcDir: 'src',
  // 크롬 확장프로그램 로드 선택기에서 숨김 폴더(.output)가 보이지 않는 문제를 방지하기 위해 일반 폴더명 사용
  outDir: 'output',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: '메디 브릿지 (MEDI BRIDGE) — 네이버 지도 비급여·이벤트 가격 비교',
    short_name: '메디 브릿지',
    description:
      '네이버 지도 위에서 심평원 비급여 정가와 모두닥·강남언니·여신티켓·바비톡·굿닥 이벤트 최저가를 VAT 포함 기준으로 비교합니다.',
    version: '1.0.0',
    // 최소 권한 원칙: 로컬 설정·캐시 저장을 위한 storage와 비교 호스트만 선언
    permissions: ['storage'],
    host_permissions: [
      'https://map.naver.com/*',
      'https://pcmap.place.naver.com/*',
      'https://www.modoodoc.com/*',
      `${PRODUCTION_WEB_ORIGIN}/*`,
    ],
    action: {
      default_title: '메디 브릿지 (MEDI BRIDGE)',
      default_icon: {
        16: 'icon/active-16.png',
        32: 'icon/active-32.png',
        48: 'icon/active-48.png',
        128: 'icon/active-128.png',
      },
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
  },
});
