<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { initializeLocale, t } from '$lib/i18n/index.js';

  let remainingSeconds = 30;

  onMount(() => {
    initializeLocale();
    let disposed = false;
    let unlisten = () => {};

    invoke('get_eye_care_status').then((status) => {
      if (!disposed && status?.phase === 'PRE_BREAK') {
        remainingSeconds = status.remainingSeconds;
      }
    }).catch(() => {});
    listen('eye-care-status-changed', (event) => {
      if (!disposed && event.payload?.phase === 'PRE_BREAK') {
        remainingSeconds = event.payload.remainingSeconds;
      }
    }).then((cleanup) => {
      if (disposed) cleanup(); else unlisten = cleanup;
    }).catch(() => {});

    return () => {
      disposed = true;
      unlisten();
    };
  });
</script>

<div class="notice-shell">
  <aside class="notice" aria-label={t('eyeCare.preBreakTitle')}>
    <div class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2.5 12s3.4-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.4 5.5-9.5 5.5S2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    </div>
    <div class="copy">
      <strong>{t('eyeCare.preBreakTitle')}</strong>
      <span>{t('eyeCare.preBreakDescription', { seconds: remainingSeconds })}</span>
    </div>
    <div class="seconds" aria-live="polite">{remainingSeconds}</div>
  </aside>
</div>

<style>
  /* 窗口背景必须完全透明，让透明窗口的四角真正透出桌面。
     卡片（.notice）用 margin 包裹，圆角外是真正的透明区。 */
  :global(html), :global(body), :global(#app) {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }

  .notice-shell {
    width: 100%;
    height: 100%;
    padding: 0;
  }

  .notice {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 20px;
    overflow: hidden;
    background: #141416;
    color: #f5f5f7;
    font-family: "SF Pro Display", "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
    user-select: none;
    /* 深色投影模拟毛玻璃层次感，因为窗口 shadow(false) 不画系统阴影 */
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(10, 132, 255, 0.16);
    color: #64d2ff;
  }

  .icon svg {
    width: 20px;
    height: 20px;
  }

  .copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 600; }
  span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #98989d; font-size: 12px; }

  .seconds {
    min-width: 34px;
    text-align: right;
    color: #64d2ff;
    font-size: 26px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
</style>
