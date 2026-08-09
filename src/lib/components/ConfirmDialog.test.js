import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readSources() {
  return Promise.all([
    readFile(new URL('./ConfirmDialog.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../app.css', import.meta.url), 'utf8'),
    readFile(new URL('../../routes/timeline/Timeline.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../routes/report/Report.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../utils/focusTrap.js', import.meta.url), 'utf8'),
  ]);
}

test('共享确认框应复用固定亮色 12px 二级交互规范', async () => {
  const [source, css] = await readSources();

  assert.match(source, /class="modal-overlay confirm-dialog-overlay fixed inset-0 z-\[200\]"/);
  assert.match(source, /class=\{`modal-panel confirm-dialog-panel/);
  assert.match(source, /class="modal-header confirm-dialog-header"/);
  assert.match(source, /class="modal-body confirm-dialog-body"/);
  assert.match(source, /class="modal-footer confirm-dialog-footer"/);
  assert.doesNotMatch(source, /dark:|rounded-3xl|backdrop-blur-md|shadow-2xl/);

  assert.match(css, /\.confirm-dialog-panel\s*\{[\s\S]*width:\s*min\(26\.25rem/);
  assert.match(css, /\.confirm-dialog-panel\s*\{[\s\S]*border-radius:\s*0\.75rem/);
  assert.match(css, /\.confirm-dialog-panel\s*\{[\s\S]*background:\s*#ffffff/);
  assert.match(css, /\.confirm-dialog-overlay\s*\{[\s\S]*z-index:\s*200/);
});

test('共享确认框应支持遮罩、关闭、Escape、焦点约束与可访问说明', async () => {
  const [source, , , , focusTrapSource] = await readSources();

  assert.match(source, /class="modal-backdrop-button"[\s\S]*on:click=\{\(\) => resolveConfirm\(false\)\}/);
  assert.match(source, /class="modal-close"[\s\S]*aria-label=\{t\('window\.close'\)\}/);
  assert.match(source, /use:trapFocus/);
  assert.match(source, /aria-describedby="confirm-dialog-description"/);
  assert.match(source, /id="confirm-dialog-description"/);
  assert.match(source, /tabindex="-1"/);
  assert.match(source, /data-autofocus="true"/);
  assert.match(source, /if \(!dialogState\) return;/);
  assert.match(focusTrapSource, /querySelector\('\[data-autofocus="true"\]'\)/);
});

test('删除活动与删除预设应明确接入共享危险确认框', async () => {
  const [source, , timelineSource, reportSource] = await readSources();

  assert.match(source, /danger:\s*\{[\s\S]*className:\s*'confirm-dialog-tone-danger'/);
  assert.match(
    timelineSource,
    /import \{ confirm \} from '\$lib\/stores\/confirm\.js'/,
    '时间线不能退化为 window.confirm'
  );
  assert.match(timelineSource, /async function deleteActivity[\s\S]*tone:\s*'danger'/);
  assert.match(reportSource, /async function deletePreset[\s\S]*tone:\s*'danger'/);
});
