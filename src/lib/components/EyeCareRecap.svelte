<script>
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n/index.js';

  export let recap = null;
  export let standalone = false;
  const dispatch = createEventDispatcher();

  function formatDuration(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    const minutes = Math.round(value / 60);
    return minutes < 1
      ? t('eyeCare.recapLessThanMinute')
      : t('eyeCare.recapMinutes', { minutes });
  }

  function close() {
    dispatch('close');
  }
</script>

{#if recap}
  <div class:standalone class="recap-backdrop" role="presentation">
    <section class="recap-card" role="dialog" aria-modal="true" aria-labelledby="eye-care-recap-title">
      <div class="recap-eyebrow">{t('eyeCare.recapKicker')}</div>
      <h2 id="eye-care-recap-title">{t('eyeCare.recapTitle')}</h2>
      {#if recap.empty}
        <p class="empty">{t('eyeCare.recapEmpty')}</p>
      {:else}
        <div class="total"><span class="total-label">{t('eyeCare.recapTotal')}</span><strong>{formatDuration(recap.totalDurationSeconds)}</strong></div>
        <div class="grid">
          <div>
            <h3>{t('eyeCare.recapTopApps')}</h3>
            <ul>
              {#each recap.topApps || [] as item}
                <li><span>{item.name}</span><b>{formatDuration(item.durationSeconds)}</b></li>
              {/each}
            </ul>
          </div>
          <div>
            <h3>{t('eyeCare.recapTopWebsites')}</h3>
            {#if (recap.topWebsites || []).length}
              <ul>
                {#each recap.topWebsites as item}
                  <li><span>{item.name}</span><b>{formatDuration(item.durationSeconds)}</b></li>
                {/each}
              </ul>
            {:else}
              <p class="muted">{t('eyeCare.recapNoWebsites')}</p>
            {/if}
          </div>
        </div>
        {#if (recap.ocrKeywords || []).length}
          <div class="keywords">
            <h3>{t('eyeCare.recapOcrKeywords')}</h3>
            <div>{#each recap.ocrKeywords as word}<span>{word}</span>{/each}</div>
          </div>
        {/if}
      {/if}
      <div class="actions"><button type="button" on:click={close}>{t('eyeCare.recapContinue')}</button></div>
    </section>
  </div>
{/if}

<style>
  .recap-backdrop {
    position: fixed;
    inset: 0;
    z-index: 220;
    display: grid;
    place-items: center;
    padding: 28px;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .recap-backdrop.standalone {
    box-sizing: border-box;
    position: static;
    width: 100%;
    height: 100%;
    padding: 24px;
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .recap-backdrop.standalone .recap-card {
    box-sizing: border-box;
    width: 100%;
    max-height: 100%;
    padding: 26px 28px 28px;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.10);
  }

  .recap-card {
    width: min(680px, calc(100vw - 56px));
    max-height: calc(100vh - 56px);
    overflow: auto;
    box-sizing: border-box;
    padding: 28px;
    border: 1px solid var(--surface-border-default, rgba(0, 0, 0, 0.10));
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    color: #1d1d1f;
    font-family: "SF Pro Display", "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;
  }

  :global(.dark) .recap-card {
    background: rgba(28, 28, 30, 0.96);
    color: #f5f5f7;
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  }

  .recap-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #86868b;
  }

  h2 { margin: 8px 0 20px; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
  h3 { margin: 20px 0 10px; font-size: 13px; font-weight: 650; color: #6e6e73; }
  :global(.dark) h3 { color: #98989d; }

  .total {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
    border-radius: 14px;
    background: #f8fafc;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  :global(.dark) .total {
    background: #2c2c2e;
    border-color: rgba(255, 255, 255, 0.07);
  }

  .total-label { font-size: 13px; color: #6e6e73; }
  :global(.dark) .total-label { color: #98989d; }

  .total strong {
    font-size: 1.85rem;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .empty { padding: 16px 18px; border-radius: 14px; background: #f8fafc; color: #6e6e73; font-size: 14px; }
  :global(.dark) .empty { background: #2c2c2e; color: #98989d; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

  ul { list-style: none; margin: 0; padding: 0; }
  li {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    font-size: 14px;
  }
  :global(.dark) li { border-bottom-color: rgba(255, 255, 255, 0.07); }
  li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  li b { flex: none; font-size: 12px; font-weight: 500; color: #86868b; font-variant-numeric: tabular-nums; }

  .keywords > div { display: flex; flex-wrap: wrap; gap: 8px; }
  .keywords span {
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    background: #f8fafc;
    border: 1px solid rgba(0, 0, 0, 0.05);
    color: #6e6e73;
  }
  :global(.dark) .keywords span {
    background: #2c2c2e;
    border-color: rgba(255, 255, 255, 0.07);
    color: #98989d;
  }

  .muted { font-size: 13px; color: #86868b; }

  .actions { display: flex; justify-content: flex-end; margin-top: 24px; }
  .actions button {
    min-height: 40px;
    padding: 0 22px;
    border: none;
    border-radius: 999px;
    background: #3b82f6;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: filter 160ms ease;
  }
  .actions button:hover { filter: brightness(1.08); }
  .actions button:active { filter: brightness(0.94); }
  :global(.dark) .actions button { background: #0a84ff; }
</style>
