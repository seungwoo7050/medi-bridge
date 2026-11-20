export const CHROME_STORE_URL = (process.env.NEXT_PUBLIC_CHROME_STORE_URL ?? '').trim();

export const HAS_CHROME_STORE_URL = CHROME_STORE_URL.length > 0;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://medi-bridge.pages.dev')
  .trim()
  .replace(/\/+$/, '');

export const GITHUB_RELEASE_URL = (
  process.env.NEXT_PUBLIC_RELEASE_URL ?? 'https://github.com/seungwoo7050/medi-bridge/releases'
).trim();
