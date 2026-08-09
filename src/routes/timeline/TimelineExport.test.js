import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// 静态校验：时间线 JSON 导出在源码层保持期望结构。
// 这层校验防止重构时退回原生 ask、改错 invoke 命令名或重新混淆“排除 OCR”与“取消导出”。
test('时间线导出应使用应用内 OCR 选择弹窗，并只保留 plugin-dialog 的 save', async () => {
  const source = await readFile(
    new URL('./Timeline.svelte', import.meta.url),
    'utf8'
  );

  // save 仅用于选择路径；OCR 范围由应用内弹窗处理，不再使用原生 ask。
  assert.match(
    source,
    /import \{ save as saveDialog \} from '@tauri-apps\/plugin-dialog';/
  );
  assert.doesNotMatch(source, /\bask\s*\(/);

  // 每次打开都采用更安全的“不包含 OCR”默认值。
  assert.match(
    source,
    /function openExportOcrChoice\(event\) \{[\s\S]*?includeOcrInExport = false;[\s\S]*?showExportOcrChoice = true;/
  );

  // 取消只关闭应用内弹窗；确认后才把布尔选择交给实际导出函数。
  assert.match(
    source,
    /async function closeExportOcrChoice\(\) \{\s*showExportOcrChoice = false;/
  );
  assert.match(
    source,
    /const includeOcr = includeOcrInExport;\s*showExportOcrChoice = false;[\s\S]*?await exportTimelineJson\(includeOcr\);/
  );
  assert.match(source, /async function exportTimelineJson\(includeOcr\)/);

  // 调用 saveDialog 时给定默认文件名与 JSON 过滤器，体验上更清晰
  assert.match(
    source,
    /saveDialog\(\{\s*defaultPath: `timeline-\$\{selectedDate\}\.json`,\s*filters: \[\{ name: 'JSON', extensions: \['json'\] \}\],/s
  );

  // invoke 参数命名遵循 camelCase（Tauri 自动 → snake_case）
  assert.match(
    source,
    /invoke\('export_timeline_json', \{\s*date: selectedDate,\s*targetPath,\s*includeOcr,/s
  );
});

test('时间线工具栏应包含导出按钮，并在加载/无数据时禁用', async () => {
  const source = await readFile(
    new URL('./Timeline.svelte', import.meta.url),
    'utf8'
  );

  // 按钮触发函数
  assert.match(source, /on:click=\{openExportOcrChoice\}/);
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(source, /aria-expanded=\{showExportOcrChoice\}/);

  // 加载中或当前日期无活动时按钮禁用，避免无意义触发
  assert.match(
    source,
    /disabled=\{exportingTimeline \|\| !activities\.length\}/
  );
});

test('OCR 选择弹窗应具有明确的取消语义、可访问结构与键盘关闭行为', async () => {
  const source = await readFile(
    new URL('./Timeline.svelte', import.meta.url),
    'utf8'
  );

  assert.match(source, /\{#if showExportOcrChoice\}[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/);
  assert.match(source, /role="radiogroup" aria-label=\{t\('timeline\.exportChoiceTitle'\)\}/);
  assert.equal((source.match(/role="radio"/g) || []).length >= 2, true);
  assert.match(source, /aria-checked=\{!includeOcrInExport\}/);
  assert.match(source, /data-autofocus="true"/);
  assert.match(source, /event\.key === 'Escape' && showExportOcrChoice/);
  assert.match(source, /void closeExportOcrChoice\(\);/);
  assert.match(source, /t\('timeline\.exportChoiceDefaultNote'\)/);
});

test('四种语言 locale 的 timeline 块都应包含导出相关文案', async () => {
  const locales = ['zh-CN', 'zh-TW', 'en', 'ar'];
  const requiredKeys = [
    'exportTitle',
    'exportNothing',
    'exportChoiceKicker',
    'exportChoiceTitle',
    'exportChoiceDescription',
    'exportChoicePrivacy',
    'exportChoiceExclude',
    'exportChoiceExcludeDescription',
    'exportChoiceRecommended',
    'exportChoiceInclude',
    'exportChoiceIncludeDescription',
    'exportChoiceFootnote',
    'exportChoiceDefaultNote',
    'exportChoiceContinue',
    'exportSuccess',
    'exportFailed',
  ];

  for (const locale of locales) {
    const mod = await import(`../../lib/i18n/locales/${locale}.js`);
    const timelineDict = mod.default?.timeline;
    assert.ok(timelineDict, `locale ${locale} 缺少 timeline 命名空间`);
    for (const key of requiredKeys) {
      assert.ok(
        typeof timelineDict[key] === 'string' && timelineDict[key].length > 0,
        `locale ${locale} 缺少 timeline.${key}`,
      );
    }
  }
});
