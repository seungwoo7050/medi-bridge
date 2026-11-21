export const CHROME_STORE_URL = (process.env.NEXT_PUBLIC_CHROME_STORE_URL ?? '').trim();

export const HAS_CHROME_STORE_URL = CHROME_STORE_URL.length > 0;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://medi-bridge.seungwoo7050.workers.dev'
)
  .trim()
  .replace(/\/+$/, '');

export const EXTENSION_ZIP_URL = '/downloads/medi-bridge-chrome-mv3.zip';

export const GITHUB_REPO_URL = (
  process.env.NEXT_PUBLIC_REPO_URL ?? 'https://github.com/seungwoo7050/medi-bridge'
).trim();
