import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cssUrl = new URL('./app.css', import.meta.url);
const typographySourceUrls = [
  cssUrl,
  new URL('./routes/timeline/Timeline.svelte', import.meta.url),
  new URL('./routes/settings/components/SettingsSystem.svelte', import.meta.url),
  new URL('./routes/about/About.svelte', import.meta.url),
  new URL('./lib/components/ActivityHourlyChart.svelte', import.meta.url),
  new URL('./lib/components/ConfirmDialog.svelte', import.meta.url),
  new URL('./lib/components/StatsCard.svelte', import.meta.url),
];


function readCssBlockAt(source, selectorIndex, selector) {
  const openingBraceIndex = source.indexOf('{', selectorIndex + selector.length);
  assert.notEqual(openingBraceIndex, -1, `选择器缺少样式块：${selector}`);

  let depth = 0;
  for (let index = openingBraceIndex; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(selectorIndex, index + 1);
  }

  assert.fail(`样式块未闭合：${selector}`);
}

function readCssBlock(source, selector) {
  const selectorIndex = source.indexOf(selector);
  assert.notEqual(selectorIndex, -1, `未找到 CSS 选择器：${selector}`);
  return readCssBlockAt(source, selectorIndex, selector);
}

function readCssBlockContaining(source, selector, requiredText) {
  let selectorIndex = source.indexOf(selector);
  while (selectorIndex !== -1) {
    const block = readCssBlockAt(source, selectorIndex, selector);
    if (block.includes(requiredText)) return block;
    selectorIndex = source.indexOf(selector, selectorIndex + selector.length);
  }

  assert.fail(`未找到包含 ${requiredText} 的 CSS 样式块：${selector}`);
}

test('全应用应提供操作与阅读内容轴以及三级边界 token', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /--content-width-operation:\s*78rem/);
  assert.match(css, /--content-width-reading:\s*64rem/);
  assert.match(css, /--surface-border-subtle:/);
  assert.match(css, /--surface-border-default:/);
  assert.match(css, /--surface-border-emphasis:/);
  assert.match(
    readCssBlockContaining(css, '.page-axis-operation', 'max-width: var(--content-width-operation)'),
    /max-width:\s*var\(--content-width-operation\)/,
  );
  assert.match(
    readCssBlockContaining(css, '.page-axis-reading', 'max-width: var(--content-width-reading)'),
    /max-width:\s*var\(--content-width-reading\)/,
  );
  assert.match(readCssBlock(css, '.page-axis-operation,'), /margin-inline:\s*auto/);
});

test('深色模式边界 token 应使用低对比中性层级', async () => {
  const css = await readFile(cssUrl, 'utf8');

  const darkTokens = readCssBlock(css, '.dark');
  // Apple dark 映射：边界以半透明白层级表达
  assert.match(darkTokens, /--surface-border-subtle:\s*rgba\(255,\s*255,\s*255,\s*0\.10\)/);
  assert.match(darkTokens, /--surface-border-default:\s*rgba\(255,\s*255,\s*255,\s*0\.14\)/);
  assert.match(darkTokens, /--editorial-surface-featured:\s*#1c1c1e/);
  assert.match(darkTokens, /--editorial-surface-subtle:\s*#2c2c2e/);
  assert.doesNotMatch(css, /rgba\(48,\s*54,\s*61/);
});

test('共享卡片应为无描边无阴影的纯净表面（Apple 纪律）', async () => {
  const css = await readFile(cssUrl, 'utf8');

  const pageCard = readCssBlock(css, '.page-card');
  assert.match(pageCard, /background:\s*var\(--editorial-surface-featured\)/);
  assert.match(pageCard, /box-shadow:\s*none/);
  assert.doesNotMatch(pageCard, /border-color:/);
});

test('概览 KPI 在窄屏应改为单列，避免标题与数值被挤成竖排', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const compactOverview = readCssBlockContaining(
    css,
    '@media (max-width: 520px)',
    '.overview-summary-grid',
  );

  assert.match(
    readCssBlock(compactOverview, '.app-shell .overview-summary-grid'),
    /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
});

test('设置页中等窗口导航应横向滚动且标签不收缩', async () => {
  const css = await readFile(cssUrl, 'utf8');

  const compactSettings = readCssBlockContaining(
    css,
    '@media (max-width: 920px)',
    '.settings-tab-rail',
  );
  assert.match(readCssBlock(compactSettings, '.settings-tab-rail'), /display:\s*flex/);
  assert.match(readCssBlock(compactSettings, '.settings-tab-rail'), /overflow-x:\s*auto/);
  const compactTabItem = readCssBlock(compactSettings, '.settings-tab-rail-item');
  assert.match(compactTabItem, /flex:\s*0 0 auto/);
  assert.match(compactTabItem, /width:\s*auto/);
});

test('设置动态字段网格应从单列渐进到双列', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(readCssBlock(css, '.settings-responsive-field-grid'), /grid-template-columns:\s*1fr/);
  const mediumSettings = readCssBlock(css, '@media (min-width: 768px)');
  assert.match(
    readCssBlock(mediumSettings, '.settings-responsive-field-grid'),
    /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  );
});



test('全局根字号应为 16px、正文不得低于 10px，标题不得使用负字距压缩', async () => {
  const [css, ...sources] = await Promise.all(typographySourceUrls.map((url) => readFile(url, 'utf8')));
  const undersized = [...css.matchAll(/(?:font-size:\s*|text-\[)([\d.]+)(px|rem)/g)]
    .map((match) => ({ value: Number(match[1]), unit: match[2], source: match[0] }))
    .filter(({ value, unit }) => (unit === 'rem' ? value * 16 : value) < 10);

  assert.match(css, /:root\s*\{[^}]*font-size:\s*16px/);
  assert.deepEqual(undersized, []);
  // Apple 大标题纪律：负字距允许但不得超过 -0.03em（正文/辅助文字禁止负字距，最小 12px 不适用）
  const overlyTight = [...[css, ...sources].join('\n').matchAll(/letter-spacing:\s*(-[\d.]+)em/g)]
    .map((m) => Number(m[1]))
    .filter((v) => v < -0.03);
  assert.deepEqual(overlyTight, []);
});

test('助手与关于页应将操作区接入操作轴，并让主体继续使用阅读轴', async () => {
  const [askSource, aboutSource] = await Promise.all([
    readFile(new URL('./routes/ask/Ask.svelte', import.meta.url), 'utf8'),
    readFile(new URL('./routes/about/About.svelte', import.meta.url), 'utf8'),
  ]);

  assert.match(askSource, /page-header page-axis-operation/);
  assert.match(askSource, /page-title-group/);
  assert.match(askSource, /page-title-badge/);
  assert.doesNotMatch(askSource, /ask-context-strip/);
  assert.match(askSource, /ask-thread-shell[^"]*page-axis-reading/);
  assert.match(askSource, /ask-composer-shell[^"]*page-axis-reading/);
  assert.match(aboutSource, /page-header page-axis-operation/);
  assert.match(aboutSource, /about-minimal-shell[^"]*page-axis-reading/);
});
