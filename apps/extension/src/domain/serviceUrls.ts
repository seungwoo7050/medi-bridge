export const DEFAULT_PRODUCTION_WEB_URL = 'https://medi-bridge.seungwoo7050.workers.dev';

function resolveBaseUrl(): string {
  const raw = import.meta.env.WXT_PUBLIC_WEB_URL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return (trimmed || DEFAULT_PRODUCTION_WEB_URL).replace(/\/+$/, '');
}

export const WEB_APP_URL = resolveBaseUrl();
