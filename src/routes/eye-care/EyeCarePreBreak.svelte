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
  :global(html), :global(body), :global(#app) {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* 窗口本身不透明，用径向渐变模拟投影渐隐。
     外圈暗 → 中心不透明，与 .notice 的 20px 圆角无缝衔接。
     彻底消除 Windows 透明窗口圆角漏光问题。 */
  .notice-shell {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at center,
      rgba(20, 20, 22, 1) 58%,
      rgba(20, 20, 22, 0.6) 78%,
      rgba(20, 20, 22, 0) 100%);
  }

  .notice {
    box-sizing: border-box;
    width: 420px;
    height: 124px;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 20px;
    overflow: hidden;
    background: rgba(20, 20, 22, 1);
    color: #f5f5f7;
    font-family: "SF Pro Display", "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
    user-select: none;
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
