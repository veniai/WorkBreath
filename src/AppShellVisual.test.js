import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readSources = () => Promise.all([
  readFile(new URL('./App.svelte', import.meta.url), 'utf8'),
  readFile(new URL('./app.css', import.meta.url), 'utf8'),
]);

test('应用壳层应使用方案 A 的紧凑双栏结构', async () => {
  const [appSource, css] = await readSources();

  assert.match(appSource, /app-shell-windowbar-title[^>]*>WorkBreath</);
  assert.match(appSource, /grid-cols-\[12\.75rem_minmax\(0,1fr\)\]\s+gap-0\s+m-0/);
  assert.match(appSource, /app-shell-sidebar-frame/);
  assert.match(appSource, /app-shell-main-frame/);

  assert.match(css, /2026-08 紧凑亮色工作台/);
  assert.match(css, /\.app-shell \.app-shell-stage\s*\{[^}]*gap:\s*0;[^}]*margin:\s*0;[^}]*padding-right:\s*0;[^}]*padding-bottom:\s*0;[^}]*padding-left:\s*0;/);
  assert.match(css, /\.app-shell \.app-shell-sidebar-frame\s*\{[^}]*border-inline-end:\s*1px solid #dfe6eb;[^}]*background:\s*#f2f5f7;/);
});

test('外层 WebView 保持方形，内部 frame 不再重复使用大圆角卡片', async () => {
  const [, css] = await readSources();

  assert.match(css, /\.app-shell\s*\{[^}]*border-radius:\s*0;/);
  assert.match(css, /\.app-shell \.app-shell-sidebar-frame,\s*\.app-shell \.app-shell-main-frame\s*\{[^}]*padding:\s*0;[^}]*border-radius:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/);
  assert.match(css, /\.app-shell \.app-shell-sidebar\s*\{[^}]*border-radius:\s*0;[^}]*background:\s*#f2f5f7;/);
  assert.match(css, /\.app-shell \.app-shell-main\s*\{[^}]*padding:\s*0;[^}]*border-radius:\s*0;[^}]*background:\s*#f8fafb;/);
});

test('窗口栏应是轻量分隔层而不是空白装饰带', async () => {
  const [, css] = await readSources();

  assert.match(css, /\.app-shell-windowbar\s*\{[^}]*border-bottom:\s*1px solid #ebf0f3;[^}]*background:\s*#f8fafb;/);
  assert.match(css, /\.app-shell-windowbar-title\s*\{[^}]*color:\s*#81909c;[^}]*font-size:\s*0\.6875rem/);
  assert.doesNotMatch(css, /\.app-shell-windowbar::before/);
});

test('侧边栏应使用紧凑字号、蓝色激活态与固定亮色底', async () => {
  const [, css] = await readSources();

  assert.match(css, /\.app-shell \.sidebar-nav-label\s*\{[^}]*font-size:\s*0\.8125rem/);
  assert.match(css, /\.app-shell \.sidebar-nav-item\s*\{[^}]*min-height:\s*2\.375rem;[^}]*border-radius:\s*0\.5rem/);
  assert.match(css, /\.app-shell \.sidebar-nav-item-active\s*\{[^}]*background:\s*#e9f2ff;[^}]*color:\s*#1d64d6/);
  assert.match(css, /\.app-shell \.sidebar-status-panel\s*\{[^}]*border:\s*1px solid #dfe6eb;[^}]*border-radius:\s*0\.625rem;[^}]*background:\s*#ffffff/);
});

test('主内容滚动区应贴合扁平 frame，并保留轻量滚动条', async () => {
  const [, css] = await readSources();

  assert.match(css, /\.app-shell \.app-shell-main-scroll\s*\{[^}]*margin-right:\s*0;[^}]*padding-right:\s*0;[^}]*padding-bottom:\s*0;[^}]*border-radius:\s*0/);
  assert.match(css, /\.app-shell \.app-shell-main-scroll::-webkit-scrollbar-track\s*\{[^}]*margin-block:\s*0\.5rem/);
  assert.match(css, /\.app-shell-main-scroll::-webkit-scrollbar-button\s*\{[^}]*display:\s*none/);
});

test('窄窗仍应折叠为图标 rail', async () => {
  const [, css] = await readSources();

  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.app-shell \.app-shell-stage\s*\{[^}]*grid-template-columns:\s*4\.25rem minmax\(0, 1fr\)\s*!important/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.app-shell \.sidebar-recording-copy\s*\{[^}]*display:\s*none/);
});

test('浮层滚动条继续使用轻量内嵌样式', async () => {
  const [css, askSource] = await Promise.all([
    readFile(new URL('./app.css', import.meta.url), 'utf8'),
    readFile(new URL('./routes/ask/Ask.svelte', import.meta.url), 'utf8'),
  ]);

  assert.match(askSource, /app-floating-scroll/);
  assert.match(css, /\.app-floating-scroll\s*\{[^}]*scrollbar-width:\s*thin/);
  assert.match(css, /\.app-floating-scroll::-webkit-scrollbar-button\s*\{[^}]*display:\s*none/);
});
