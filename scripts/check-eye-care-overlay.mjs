import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Reuse the project's browser smoke setup; no real desktop commands are issued.
const baseUrl = process.env.EYE_CARE_CHECK_BASE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    const callbacks = new Map();
    let nextId = 1;
    window.overlayCheck = { calls: [], statusListener: null, resolveSnapshot: null };
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };
    window.__TAURI_INTERNALS__ = {
      transformCallback(callback) {
        const id = nextId++;
        callbacks.set(id, callback);
        return id;
      },
      invoke: async (command, args = {}) => {
        window.overlayCheck.calls.push(command);
        if (command === 'plugin:event|listen') {
          window.overlayCheck.statusListener = callbacks.get(args.handler);
          return args.handler;
        }
        if (command === 'get_eye_care_status') {
          return new Promise(resolve => { window.overlayCheck.resolveSnapshot = resolve; });
        }
        if (command === 'plugin:event|unlisten' || command === 'eye_care_emergency_release') {
          return null;
        }
        throw new Error(`Unexpected overlay command: ${command}`);
      },
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('eye-care-overlay.html', baseUrl).href);
  await page.waitForFunction(() => typeof window.overlayCheck.resolveSnapshot === 'function');
  assert.equal(await page.locator('.countdown').textContent(), '—:—');

  // A tick can arrive while the initial IPC snapshot is still in flight.
  await page.evaluate(() => {
    window.overlayCheck.statusListener({ payload: { remainingSeconds: 125, progress: 0.3 } });
    window.overlayCheck.resolveSnapshot({ remainingSeconds: 180, progress: 0 });
  });
  await page.waitForFunction(() => document.querySelector('.countdown').textContent === '02:05');
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '30');
  await page.evaluate(() => {
    window.overlayCheck.statusListener({ payload: { remainingSeconds: 124, progress: 0.31 } });
  });
  await page.waitForFunction(() => document.querySelector('.countdown').textContent === '02:04');

  for (const viewport of [{ width: 1000, height: 700 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const bounds = await page.locator('.rest-screen').boundingBox();
    assert.equal(bounds.width, viewport.width);
    assert.equal(bounds.height, viewport.height);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.glow')).animationName), 'none');
  }
  assert.deepEqual(await page.evaluate(() => window.overlayCheck.calls), [
    'plugin:event|listen', 'get_eye_care_status',
  ]);

  // The standalone entry must retain App.svelte's navigation/menu guards.
  assert.deepEqual(await page.evaluate(() => ['dragover', 'drop', 'contextmenu'].map(type => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    document.querySelector('.rest-screen').dispatchEvent(event);
    return event.defaultPrevented;
  })), [true, true, true]);

  // An incomplete emergency chord must cancel its timer; a full hold releases once.
  for (const key of ['Control', 'Alt', 'Shift', 'F12']) await page.keyboard.down(key);
  await page.keyboard.up('F12');
  await page.waitForTimeout(5100);
  assert.equal(await page.evaluate(() => window.overlayCheck.calls.includes('eye_care_emergency_release')), false);
  await page.keyboard.down('F12');
  await page.waitForFunction(() => window.overlayCheck.calls.includes('eye_care_emergency_release'), undefined, { timeout: 7000 });
  for (const key of ['F12', 'Shift', 'Alt', 'Control']) await page.keyboard.up(key);
  assert.equal(await page.evaluate(() => window.overlayCheck.calls.filter(cmd => cmd === 'eye_care_emergency_release').length), 1);
  assert.deepEqual(errors, []);
  console.log('Eye-care overlay: delayed snapshot, live ticks, viewport coverage, reduced motion, isolated bootstrap, navigation guards and emergency hold passed.');
} finally {
  await browser.close();
}
