import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('存储设置的三项危险操作应统一使用共享确认框', async () => {
  const source = await readFile(
    new URL('./components/SettingsStorage.svelte', import.meta.url),
    'utf8',
  );

  assert.match(source, /import \{ confirm \} from '\$lib\/stores\/confirm\.js'/);
  assert.doesNotMatch(source, /import \{[^}]*\bask\b[^}]*\} from '@tauri-apps\/plugin-dialog'/);
  assert.doesNotMatch(source, /\bask\s*\(/);
  assert.equal((source.match(/await confirm\(\{/g) || []).length, 3);
  assert.equal((source.match(/tone:\s*'danger'/g) || []).length, 3);

  for (const key of [
    'clearHistoryConfirmTitle',
    'clearHistoryConfirmMessage',
    'migrateConfirmTitle',
    'migrateConfirmMessage',
    'cleanupOldConfirmTitle',
    'cleanupOldConfirmMessage',
  ]) {
    assert.match(source, new RegExp(`settingsStorage\\.${key}`));
  }

  assert.match(source, /confirmText:\s*t\('settingsStorage\.clearHistoryAction'\)/);
  assert.match(source, /confirmText:\s*t\('settingsStorage\.cleanOldDir'\)/);
  assert.match(source, /cancelText:\s*t\('common\.cancel'\)/);
  assert.match(source, /open as openDialog/);
});

test('时间线 OCR 导出应使用应用内中性选择弹窗而不是原生 ask', async () => {
  const source = await readFile(
    new URL('../timeline/Timeline.svelte', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /import \{[^}]*\bask\b[^}]*\} from '@tauri-apps\/plugin-dialog'/);
  assert.doesNotMatch(source, /\bask\s*\(/);
  assert.match(source, /let showExportOcrChoice = false;/);
  assert.match(source, /role="radiogroup" aria-label=\{t\('timeline\.exportChoiceTitle'\)\}/);
  assert.match(source, /on:click=\{closeExportOcrChoice\}/);
});

test('迁移完成后应先切换当前目录，再保留不同于新目录的旧目录候选', async () => {
  const source = await readFile(
    new URL('./components/SettingsStorage.svelte', import.meta.url),
    'utf8',
  );

  assert.match(source, /const previousDataDir = \(result\?\.oldDataDir \|\| dataDir \|\| ''\)\.trim\(\)/);
  assert.match(source, /const migratedDataDir = \(result\?\.dataDir \|\| nextDir \|\| ''\)\.trim\(\)/);
  assert.match(
    source,
    /dataDir = migratedDataDir;\s*cleanupCandidateDir =\s*previousDataDir && previousDataDir !== migratedDataDir \? previousDataDir : '';/,
  );

  const migrationStart = source.indexOf("const result = await invoke('change_data_dir'");
  const dispatchIndex = source.indexOf("dispatch('dataDirChanged', result)", migrationStart);
  const dataDirIndex = source.indexOf('dataDir = migratedDataDir', migrationStart);
  const candidateIndex = source.indexOf('cleanupCandidateDir =', migrationStart);
  assert.ok(
    migrationStart >= 0 && dataDirIndex > migrationStart && candidateIndex > dataDirIndex && dispatchIndex > candidateIndex,
    '应在通知父组件刷新前同步新目录并保存旧目录候选，避免响应式清理误删候选',
  );
});
