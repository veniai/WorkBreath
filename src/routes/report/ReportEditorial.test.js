import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('日报页应渲染纸感成稿容器', async () => {
  const [source, appCssSource] = await Promise.all([
    readFile(new URL('./Report.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(source, /report-editorial-shell/);
  assert.match(source, /report-sheet/);
  assert.match(source, /report-article-card/);
  assert.match(source, /report-sheet-content/);
  assert.match(source, /report-kpi-band/);
  assert.match(source, /report-article-edit-btn/);
  assert.match(source, /displaySections/);
  assert.match(source, /isReportPrefaceSection/);
  assert.match(appCssSource, /\.report-sheet-content\b[\s\S]*margin:\s*0 auto/);
  assert.match(appCssSource, /\.report-sheet-content\b[\s\S]*max-width:\s*52rem/);
  assert.match(appCssSource, /\.report-kpi-grid\.report-kpi-band\s*\{[\s\S]*grid-template-columns:\s*repeat\(4/);
  assert.match(appCssSource, /\.report-editorial-shell \.markdown-body h1\s*\{[\s\S]*display:\s*none/);
});
