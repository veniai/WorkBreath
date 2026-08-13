import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('界面风格已收敛为唯一语言：A/B/C 开关与配置字段整体下线', async () => {
  const [
    appSource,
    appCssSource,
    settingsSource,
    appearanceSource,
    configSource,
    zhCNSource,
    enSource,
  ] = await Promise.all([
    read('./App.svelte'),
    read('./app.css'),
    read('./routes/settings/Settings.svelte'),
    read('./routes/settings/components/SettingsAppearance.svelte'),
    read('../crates/core/src/config.rs'),
    read('./lib/i18n/locales/zh-CN.js'),
    read('./lib/i18n/locales/en.js'),
  ]);

  // 前端不再消费风格字段
  assert.doesNotMatch(appSource, /ui_visual_style|uiVisualStyle|ui-style-/);
  assert.doesNotMatch(settingsSource, /ui_visual_style/);
  assert.doesNotMatch(appearanceSource, /ui_visual_style|UI_VISUAL_STYLE_OPTIONS|selectUiVisualStyle/);

  // CSS 不再存在 A/B/C 覆盖层
  assert.doesNotMatch(appCssSource, /ui-style-a|ui-style-b|ui-style-c/);

  // Rust 配置不再持久化风格字段
  assert.doesNotMatch(configSource, /ui_visual_style/);

  // i18n 不再保留风格选择文案
  assert.doesNotMatch(zhCNSource, /uiStyle[A-Z]\w*:|uiVisualStyle\w*:/);
  assert.doesNotMatch(enSource, /uiStyle[A-Z]\w*:|uiVisualStyle\w*:/);
});

test('唯一语言的设计 token 锚点：Apple 亮/暗色系', async () => {
  const appCssSource = await read('./app.css');

  // 亮色：#f5f5f7 页面底 + 细黑透明边界
  assert.match(appCssSource, /--editorial-shell-bg:\s*#f5f5f7/);
  assert.match(appCssSource, /--surface-border-subtle:\s*rgba\(0, 0, 0, 0\.08\)/);
  assert.match(appCssSource, /--surface-border-default:\s*rgba\(0, 0, 0, 0\.10\)/);

  // 暗色：#000 底 / #1c1c1e 卡片 / #2c2c2e 次级面 + 半透明白边界
  assert.match(appCssSource, /--editorial-shell-bg:\s*#000000/);
  assert.match(appCssSource, /--editorial-surface-featured:\s*#1c1c1e/);
  assert.match(appCssSource, /--editorial-surface-subtle:\s*#2c2c2e/);
  assert.match(appCssSource, /--surface-border-subtle:\s*rgba\(255, 255, 255, 0\.10\)/);
  assert.match(appCssSource, /--surface-border-default:\s*rgba\(255, 255, 255, 0\.14\)/);

  // 卡片为无描边无阴影的纯净表面（Apple 纪律）
  assert.match(appCssSource, /\.page-card \{[\s\S]*?rounded-2xl/);
  assert.match(appCssSource, /\.page-card \{[\s\S]*?box-shadow:\s*none/);

  // 旧 GitHub 暗色不再出现
  assert.doesNotMatch(appCssSource, /#0d1117|#161b22|#21262d|#30363d/);
});

test('壳层不再渲染 ambient 装饰光斑', async () => {
  const appSource = await read('./App.svelte');
  assert.doesNotMatch(appSource, /app-shell-ambient/);
});

test('护眼休息遮罩为深色静谧全屏，提醒条为深色玻璃拟态，复盘卡支持独立窗口', async () => {
  const [overlay, preBreak, recap, recapWindow] = await Promise.all([
    read('./routes/eye-care/EyeCareOverlay.svelte'),
    read('./routes/eye-care/EyeCarePreBreak.svelte'),
    read('./lib/components/EyeCareRecap.svelte'),
    read('./routes/eye-care/EyeCareRecapWindow.svelte'),
  ]);

  // 遮罩：radial 深底 + 呼吸光晕 + tabular-nums 倒计时，无糖果色 orb
  assert.match(overlay, /radial-gradient\(120% 100%/);
  assert.match(overlay, /rest-breathe 24s/);
  assert.match(overlay, /#7dd3fc/);
  assert.doesNotMatch(overlay, /orb|#d9f7ef|#ba8bc3/);

  // 提醒条：深色玻璃 + 眼睛 SVG（不用字符图标）
  assert.doesNotMatch(preBreak, /backdrop-filter/);
  assert.doesNotMatch(preBreak, /filter:\s*drop-shadow/);
  assert.match(preBreak, /<svg viewBox="0 0 24 24"/);
  assert.doesNotMatch(preBreak, /◌|#72cbb5/);

  // 复盘卡内容保持不变；独立窗口外围改为透明，不再露出方形底壳。
  assert.match(recap, /border-radius:\s*22px/);
  assert.match(recap, /1\.85rem/);
  assert.match(recap, /border-radius:\s*999px/);
  assert.match(recap, /\.recap-backdrop\.standalone[\s\S]*?background:\s*transparent/);
  assert.match(recapWindow, /<EyeCareRecap \{recap\} standalone/);
  assert.match(recapWindow, /background:\s*transparent/);
  assert.doesNotMatch(recap, /#eff8f6|#4f7f9a/);
});
