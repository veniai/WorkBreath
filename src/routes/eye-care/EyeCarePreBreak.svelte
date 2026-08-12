<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { initializeLocale, t } from '$lib/i18n/index.js';

  let remainingSeconds = 30;

  onMount(() => {
    initializeLocale();
    // 标记根元素，让组件 scoped CSS 能用高优先级覆盖全局 :root/.dark 背景。
    // 全局 app.css 的 :root { background-color:#f5f5f7 } 和 .dark { background-color:#000000 }
    // 会让透明窗口四角漏出浅色/黑色，class 选择器 + !important 确保真正透明。
    document.documentElement.classList.add('eye-care-pre-break-root');

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
      document.documentElement.classList.remove('eye-care-pre-break-root');
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
  /*
   * 透明窗口圆角根治方案：
   *
   * 1. 全局 app.css 的 :root 画了 background-color:#f5f5f7，.dark 画了 #000000。
   *    组件 scoped :global(html) 的优先级不一定能赢过全局规则。
   *    用 html.eye-care-pre-break-root（class 选择器，specificity 0,1,1 > :root 的 0,1,0）
   *    加 !important 确保根画布完全透明。
   *
   * 2. 卡片不占满窗口 100%——留 3px 透明 gutter，圆角弧线外是真正的透明区，
   *    box-shadow 也有空间扩散而不被窗口物理边界裁掉。
   */

  /* 覆盖全局 :root 和 .dark 的背景色 */
  :global(html.eye-care-pre-break-root),
  :global(html.eye-care-pre-break-root body) {
    margin: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    background: transparent !important;
    background-color: transparent !important;
  }

  :global(html.eye-care-pre-break-root.dark),
  :global(html.eye-care-pre-break-root .dark) {
    background: transparent !important;
    background-color: transparent !important;
  }

  .notice-shell {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .notice {
    box-sizing: border-box;
    width: calc(100% - 6px);
    height: calc(100% - 6px);
    margin: 3px;
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
