import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cssUrl = new URL('../../app.css', import.meta.url);

test('关于页页头应使用操作轴，主体继续使用阅读内容轴', async () => {
  const source = await readFile(new URL('./About.svelte', import.meta.url), 'utf8');

  assert.match(source, /class="page-header page-axis-operation"/);
  assert.match(source, /class="w-full about-minimal-shell page-axis-reading"/);
  assert.doesNotMatch(source, /about-minimal-shell[^\"]*\bmx-auto\b/);
  assert.doesNotMatch(source, /about-minimal-shell[^\"]*\bmax-w-4xl\b/);
});

test('关于页应落地紧凑双栏产品面板、轻量原则带与响应式更新管理', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const source = await readFile(new URL('./About.svelte', import.meta.url), 'utf8');

  assert.match(css, /\.about-product-panel\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.18fr\)\s*minmax\(21\.875rem,\s*0\.82fr\)/);
  assert.match(css, /\.about-product-identity \.about-brand-identity\s*\{[\s\S]*?flex-direction:\s*row;[\s\S]*?align-items:\s*flex-start;/);
  assert.match(css, /\.about-product-identity \.about-brand-title-row\s*\{[\s\S]*?justify-content:\s*flex-start;/);
  assert.match(css, /\.about-product-panel \.about-update-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.match(css, /\.about-principles-card \.about-trust-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[\s\S]*?gap:\s*0;/);
  assert.match(css, /\.about-principles-card \.about-trust-card \+ \.about-trust-card\s*\{/);
  assert.match(css, /\.about-principles-card\b/);
  assert.match(css, /\.about-tech-item\b/);
  assert.match(css, /@media \(max-width:\s*1080px\)[\s\S]*?\.about-product-panel\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\.about-product-panel \.about-update-grid\s*\{[\s\S]*?repeat\(3,/);
  assert.doesNotMatch(source, /about-update-grid[^\"]*\bborder-t\b/);
});

test('赞助弹窗应使用单层三列支付结构并保留二维码放大层', async () => {
  const [css, source] = await Promise.all([
    readFile(cssUrl, 'utf8'),
    readFile(new URL('./About.svelte', import.meta.url), 'utf8'),
  ]);

  assert.match(source, /about-support-dialog/);
  assert.match(source, /about-support-methods/);
  assert.equal((source.match(/class="about-support-method"/g) || []).length, 3);
  assert.equal((source.match(/class="about-qr-button"/g) || []).length, 3);
  assert.match(source, /about-qr-zoom/);
  assert.match(css, /\.about-support-dialog\s*\{[\s\S]*?border-radius:\s*0\.75rem;/);
  assert.match(css, /\.about-support-methods\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,/);
});

test('关于页新卡片的深色边界应保持低对比', async () => {
  const [css, source] = await Promise.all([
    readFile(cssUrl, 'utf8'),
    readFile(new URL('./About.svelte', import.meta.url), 'utf8'),
  ]);

  assert.match(css, /\.about-principles-card\s*\{[^}]*border-color:\s*var\(--surface-border-default\)/);
  assert.match(css, /\.about-tech-stack\s*\{[^}]*border-color:\s*var\(--surface-border-default\)/);
  assert.match(css, /\.dark \.about-principles-card\s*\{[^}]*border-color:\s*var\(--surface-border-default\)[^}]*box-shadow:\s*none/);
  assert.match(css, /\.dark \.about-tech-stack\s*\{[^}]*border-color:\s*var\(--surface-border-default\)[^}]*box-shadow:\s*none/);
  assert.doesNotMatch(source, /style="border-color:\s*var\(--surface-border-default\);"/);
});

test('关于页产品原则在深色模式下应保持标题与说明可读', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.dark \.about-trust-title\s*\{[\s\S]*?color:\s*#f5f5f7;/);
  assert.match(css, /\.dark \.about-trust-copy\s*\{[\s\S]*?color:\s*#98989d;/);
});

test('关于页不应残留旧操作条、技术胶囊和更新横幅样式', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.doesNotMatch(css, /^\.about-action-strip\b/m);
  assert.doesNotMatch(css, /^\.about-brand-head\b/m);
  assert.doesNotMatch(css, /^\.about-tech-pill(?:\b|-)/m);
  assert.doesNotMatch(css, /^\.about-update-banner\b/m);
  assert.doesNotMatch(css, /^\.dark \.about-tech-pill(?:\b|-)/m);
  assert.doesNotMatch(css, /^\.dark \.about-update-banner\b/m);
});
