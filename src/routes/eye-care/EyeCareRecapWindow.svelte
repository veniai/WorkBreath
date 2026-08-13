<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
  import EyeCareRecap from '$lib/components/EyeCareRecap.svelte';
  import { applyLocaleToDocument, initializeLocale, locale } from '$lib/i18n/index.js';

  const browserPreviewRecap = {
    totalDurationSeconds: 37 * 60,
    topApps: [
      { name: 'Visual Studio Code', durationSeconds: 19 * 60 },
      { name: 'Chrome', durationSeconds: 11 * 60 },
      { name: 'Figma', durationSeconds: 7 * 60 },
    ],
    topWebsites: [
      { name: 'github.com', durationSeconds: 7 * 60 },
      { name: 'docs.rs', durationSeconds: 3 * 60 },
    ],
    ocrKeywords: [],
    empty: false,
  };

  let recap = null;
  $: currentLocale = $locale;
  $: applyLocaleToDocument(currentLocale);

  function currentWindow() {
    try {
      return getCurrentWebviewWindow();
    } catch {
      return { hide: async () => {}, close: async () => {} };
    }
  }

  async function closeWindow() {
    try {
      await invoke('dismiss_eye_care_recap');
    } catch {
      // 后端命令通常已经隐藏并关闭整扇窗口；这里只在命令不可用时兜底。
      const window = currentWindow();
      try { await window.hide(); } catch {}
      try { await window.close(); } catch {}
    }
  }

  onMount(() => {
    initializeLocale();
    let disposed = false;
    let unlistenRecap = () => {};

    const handleKeydown = (event) => {
      if (event.key === 'Escape') closeWindow();
    };
    window.addEventListener('keydown', handleKeydown);

    (async () => {
      try {
        const pending = await invoke('get_pending_eye_care_recap');
        if (disposed) return;
        if (!pending) {
          await closeWindow();
          return;
        }
        recap = pending;
      } catch {
        // 独立入口也用于浏览器 UI 烟测；非 Tauri 环境展示稳定样例。
        if (!disposed) recap = browserPreviewRecap;
      }

      try {
        const cleanup = await listen('eye-care-recap-ready', (event) => {
          if (!disposed) recap = event.payload;
        });
        if (disposed) cleanup(); else unlistenRecap = cleanup;
      } catch {
        // 浏览器预览环境没有 Tauri 事件总线。
      }
    })();

    return () => {
      disposed = true;
      unlistenRecap();
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<main class="recap-window-shell">
  {#key currentLocale}
    <EyeCareRecap {recap} standalone on:close={closeWindow} />
  {/key}
</main>

<style>
  :global(html), :global(body), :global(#app) {
    box-sizing: border-box;
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }

  .recap-window-shell {
    width: 100%;
    height: 100%;
  }
</style>
