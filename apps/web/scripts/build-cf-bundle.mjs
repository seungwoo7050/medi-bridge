import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const webRoot = resolve(import.meta.dirname, '..');
const nextAppDir = join(webRoot, '.next', 'server', 'app');
const nextStaticDir = join(webRoot, '.next', 'static');
const publicDir = join(webRoot, 'public');
const distDir = join(webRoot, '.cf-dist');
const extOutputDir = resolve(webRoot, '../extension/output');

if (!existsSync(nextAppDir)) {
  throw new Error(`Next build output missing at ${nextAppDir}. Run next build first.`);
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

if (existsSync(publicDir)) {
  cpSync(publicDir, distDir, { recursive: true });
}

if (existsSync(extOutputDir)) {
  const zipName = readdirSync(extOutputDir).find((name) => name.endsWith('-chrome.zip'));
  if (zipName) {
    const downloadsDir = join(distDir, 'downloads');
    mkdirSync(downloadsDir, { recursive: true });
    cpSync(join(extOutputDir, zipName), join(downloadsDir, 'medi-bridge-chrome-mv3.zip'));
  }
}

if (existsSync(nextStaticDir)) {
  const staticDest = join(distDir, '_next', 'static');
  mkdirSync(staticDest, { recursive: true });
  cpSync(nextStaticDir, staticDest, { recursive: true });
}

function copyHtml(srcFile, destFile) {
  if (!existsSync(srcFile)) {
    throw new Error(`Expected HTML artifact not found: ${srcFile}`);
  }
  mkdirSync(resolve(destFile, '..'), { recursive: true });
  cpSync(srcFile, destFile);
}

copyHtml(join(nextAppDir, 'index.html'), join(distDir, 'index.html'));
copyHtml(join(nextAppDir, 'vat.html'), join(distDir, 'vat', 'index.html'));
copyHtml(join(nextAppDir, 'privacy.html'), join(distDir, 'privacy', 'index.html'));
copyHtml(join(nextAppDir, '_not-found.html'), join(distDir, '404.html'));

for (const binaryAsset of ['icon.png', 'apple-icon.png']) {
  const srcBody = join(nextAppDir, `${binaryAsset}.body`);
  if (existsSync(srcBody)) {
    cpSync(srcBody, join(distDir, binaryAsset));
  }
}

process.stdout.write(`Assembled Cloudflare static bundle at ${distDir}\n`);
