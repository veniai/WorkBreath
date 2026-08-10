<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { cache } from '$lib/stores/cache.js';
  import { locale, t } from '$lib/i18n/index.js';
  import { showToast } from '$lib/stores/toast.js';
  import { formatUserError } from '$lib/utils/errorDisplay.js';
  import SettingsEyeCare from '../settings/components/SettingsEyeCare.svelte';

  let config = null;
  let status = null;
  let loading = true;
  let saving = false;
  let dirty = false;
  let error = null;
  let nowSeconds = Math.floor(Date.now() / 1000);

  $: currentLocale = $locale;
  $: timerReason = status?.timerReason || 'INPUT_UNAVAILABLE';
  $: reasonLabel = t(`eyeCare.dashboard.reason.${timerReason}`);
  $: countedWorkSeconds = status?.countedWorkSeconds ?? status?.elapsedSeconds ?? 0;
  $: progressPercent = Math.max(0, Math.min(100, Math.round((status?.progress || 0) * 100)));
  $: progressLabel = status?.phase === 'RESTING' ? t('eyeCare.overlayProgressLabel') : t('eyeCare.dashboard.progress');
  $: recentEvents = [...(status?.recentEvents || [])].slice(-8).reverse();
  $: excludedStats = [
    { key: 'shortIdle', seconds: status?.shortIdleSeconds || 0 },
    { key: 'locked', seconds: status?.lockedSeconds || 0 },
    { key: 'suspended', seconds: status?.suspendedSeconds || 0 },
    { key: 'signalUnavailable', seconds: status?.unavailableSeconds || 0 },
    { key: 'manuallyPaused', seconds: status?.pausedSeconds || 0 },
  ];

  function normalizeConfig(loaded) {
    if (typeof loaded.eye_care_enabled !== 'boolean') loaded.eye_care_enabled = true;
    if (!Number.isInteger(loaded.eye_care_work_minutes)) loaded.eye_care_work_minutes = 40;
    if (!Number.isInteger(loaded.eye_care_rest_minutes)) loaded.eye_care_rest_minutes = 3;
    if (!Number.isInteger(loaded.eye_care_input_grace_seconds)) loaded.eye_care_input_grace_seconds = 60;
    if (!Number.isInteger(loaded.eye_care_natural_rest_minutes)) loaded.eye_care_natural_rest_minutes = 5;
    if (!Number.isInteger(loaded.eye_care_pre_break_seconds)) loaded.eye_care_pre_break_seconds = 30;
    if (typeof loaded.eye_care_paused !== 'boolean') loaded.eye_care_paused = false;
    return loaded;
  }

  async function loadDashboard() {
    loading = true;
    error = null;
    try {
      const [loadedConfig, loadedStatus] = await Promise.all([
        invoke('get_config'),
        invoke('get_eye_care_status'),
      ]);
      config = normalizeConfig(loadedConfig);
      status = loadedStatus;
      cache.setConfig(config);
    } catch (loadError) {
      error = formatUserError(loadError, t('eyeCare.dashboard.loadError'));
      console.error('加载护眼主页失败:', loadError);
    } finally {
      loading = false;
    }
  }

  async function saveConfig() {
    if (!config || saving) return;
    saving = true;
    error = null;
    try {
      await invoke('save_config', { config });
      cache.setConfig(config);
      dirty = false;
      showToast(t('settings.saveSuccessToast'), 'success');
      status = await invoke('get_eye_care_status');
    } catch (saveError) {
      error = formatUserError(saveError, t('common.loadFailedRetry'));
    } finally {
      saving = false;
    }
  }

  function formatDuration(totalSeconds, compact = false) {
    const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    if (compact && hours === 0) return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function formatIdle(seconds) {
    return seconds == null ? t('eyeCare.dashboard.unavailable') : formatDuration(seconds, true);
  }

  function formatObservedAgo(timestamp) {
    if (!timestamp) return t('eyeCare.dashboard.unavailable');
    const age = Math.max(0, nowSeconds - timestamp);
    return age <= 1 ? t('eyeCare.dashboard.justNow') : t('eyeCare.dashboard.secondsAgo', { seconds: age });
  }

  function formatEventTime(timestamp) {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleTimeString(currentLocale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function reasonTone(reason) {
    if (reason === 'COUNTING') return 'counting';
    if (reason === 'RESTING' || reason === 'WAITING_RETURN' || reason === 'NATURAL_REST') return 'resting';
    if (reason === 'INPUT_UNAVAILABLE' || reason === 'SUSPENDED_OR_UNKNOWN') return 'warning';
    return 'paused';
  }

  onMount(() => {
    let disposed = false;
    let unlistenStatus = () => {};
    const clock = setInterval(() => {
      nowSeconds = Math.floor(Date.now() / 1000);
    }, 1000);

    loadDashboard();
    listen('eye-care-status-changed', (event) => {
      if (!disposed) status = event.payload;
    }).then((cleanup) => {
      if (disposed) cleanup();
      else unlistenStatus = cleanup;
    }).catch((listenError) => {
      console.warn('监听护眼状态失败:', listenError);
    });

    return () => {
      disposed = true;
      clearInterval(clock);
      unlistenStatus();
    };
  });
</script>

<div class="page-shell eye-care-dashboard" data-locale={currentLocale}>
  <div class="page-header page-axis-operation persistent-save-header">
    <div class="page-title-group">
      <div class="page-title-badge eye-care-title-badge" aria-hidden="true">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.5 12s3.4-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.4 5.5-9.5 5.5S2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="2.5" stroke-width="1.8" />
        </svg>
      </div>
      <div class="page-title-copy">
        <h2>{t('eyeCare.dashboard.title')}</h2>
        <p>{t('eyeCare.dashboard.subtitle')}</p>
      </div>
    </div>
    {#if config}
      <div class="eye-care-save-dock">
        <span class:eye-care-save-status-dirty={dirty} class="eye-care-save-status" aria-live="polite">
          {dirty ? t('settings.unsaved') : t('settings.saved')}
        </span>
        <button class="settings-action-primary eye-care-save" on:click={saveConfig} disabled={saving || !dirty}>
          {saving ? t('settings.saving') : t('settings.save')}
        </button>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="eye-care-loading page-axis-operation">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    </div>
  {:else if error && !status}
    <div class="page-banner-error page-axis-operation">
      <div>
        <p class="font-semibold">{t('eyeCare.dashboard.loadError')}</p>
        <p class="text-sm mt-1">{error}</p>
      </div>
      <button on:click={loadDashboard} class="page-action-brand">{t('settings.retry')}</button>
    </div>
  {:else if status && config}
    <div class="eye-care-board page-axis-operation">
      <section class="eye-care-hero" aria-labelledby="current-work-heading">
        <div class="eye-care-hero-copy">
          <div class="eye-care-live-state {reasonTone(timerReason)}">
            <span class="eye-care-live-dot"></span>
            <span>{reasonLabel}</span>
          </div>
          <div class="eye-care-cycle-row">
            <div>
              <p id="current-work-heading" class="eye-care-eyebrow">{t('eyeCare.dashboard.currentWork')}</p>
              <div class="eye-care-time">{formatDuration(countedWorkSeconds)}</div>
            </div>
            <div class="eye-care-remaining-row">
              <span>{status.phase === 'RESTING' ? t('eyeCare.dashboard.restRemaining') : t('eyeCare.dashboard.remaining')}</span>
              <strong>{formatDuration(status.remainingSeconds || 0, true)}</strong>
            </div>
          </div>
          <div class="eye-care-meta-grid">
            <div>
              <span>{t('eyeCare.dashboard.observed')}</span>
              <strong>{formatDuration(status.observedSeconds || 0, true)}</strong>
            </div>
            <div>
              <span>{t('eyeCare.dashboard.excluded')}</span>
              <strong>{formatDuration(status.excludedSeconds || 0, true)}</strong>
            </div>
            <div>
              <span>{t('eyeCare.dashboard.cycleRule')}</span>
              <strong>{t('eyeCare.dashboard.cycleRuleValue', {
                work: config.eye_care_work_minutes,
                rest: config.eye_care_rest_minutes,
              })}</strong>
            </div>
          </div>
        </div>

        <div class="eye-care-progress" aria-label={`${progressLabel} ${progressPercent}%`}>
          <svg viewBox="0 0 112 112" aria-hidden="true">
            <circle class="eye-care-progress-track" cx="56" cy="56" r="46"></circle>
            <circle
              class="eye-care-progress-value"
              cx="56"
              cy="56"
              r="46"
              stroke-dasharray="289.03"
              stroke-dashoffset={289.03 * (1 - progressPercent / 100)}
            ></circle>
          </svg>
          <div class="eye-care-progress-label">
            <strong>{progressPercent}%</strong>
            <span>{progressLabel}</span>
          </div>
        </div>
      </section>

      <div class="eye-care-middle-grid">
      <section class="eye-care-diagnostics" aria-labelledby="diagnostic-heading">
        <div class="eye-care-section-heading">
          <div>
            <h3 id="diagnostic-heading">{t('eyeCare.dashboard.reasonTitle')}</h3>
            <p>{t('eyeCare.dashboard.reasonSubtitle')}</p>
          </div>
          <div class="eye-care-reason-chip {reasonTone(timerReason)}">
            <span></span>{reasonLabel}
          </div>
        </div>

        <div class="eye-care-signal-grid">
          <div class="eye-care-signal-item">
            <span>{t('eyeCare.dashboard.inputIdle')}</span>
            <strong>{formatIdle(status.inputIdleSeconds)}</strong>
          </div>
          <div class="eye-care-signal-item">
            <span>{t('eyeCare.dashboard.lastObserved')}</span>
            <strong>{formatObservedAgo(status.observedAt)}</strong>
          </div>
          <div class="eye-care-signal-item">
            <span>{t('eyeCare.dashboard.observed')}</span>
            <strong>{formatDuration(status.observedSeconds || 0, true)}</strong>
          </div>
          <div class="eye-care-signal-item">
            <span>{t('eyeCare.dashboard.excluded')}</span>
            <strong>{formatDuration(status.excludedSeconds || 0, true)}</strong>
          </div>
        </div>

        <div class="eye-care-breakdown">
          <p>{t('eyeCare.dashboard.excludedBreakdown')}</p>
          <div class="eye-care-breakdown-list">
            {#each excludedStats as item}
              <div>
                <span>{t(`eyeCare.dashboard.${item.key}`)}</span>
                <strong>{formatDuration(item.seconds, true)}</strong>
              </div>
            {/each}
          </div>
        </div>
      </section>

      <section class="eye-care-events" aria-labelledby="events-heading">
        <div class="eye-care-section-heading">
          <div>
            <h3 id="events-heading">{t('eyeCare.dashboard.eventsTitle')}</h3>
            <p>{t('eyeCare.dashboard.eventsSubtitle')}</p>
          </div>
        </div>
        {#if recentEvents.length === 0}
          <p class="eye-care-empty">{t('eyeCare.dashboard.noEvents')}</p>
        {:else}
          <div class="eye-care-event-list">
            {#each recentEvents as event}
              <div class="eye-care-event-row">
                <span class="eye-care-event-marker {reasonTone(event.reason)}"></span>
                <div class="eye-care-event-copy">
                  <strong>{t(`eyeCare.dashboard.reason.${event.reason}`)}</strong>
                  <span>{t('eyeCare.dashboard.eventAtWork', { duration: formatDuration(event.countedWorkSeconds, true) })}</span>
                </div>
                <time>{formatEventTime(event.occurredAt)}</time>
              </div>
            {/each}
          </div>
        {/if}
      </section>
      </div>

      <section class="eye-care-settings" aria-label={t('eyeCare.dashboard.settingsTitle')}>
        <SettingsEyeCare bind:config on:change={() => dirty = true} />
      </section>
    </div>
  {/if}
</div>

<style>
  .eye-care-dashboard {
    min-height: 100%;
  }

  .eye-care-title-badge {
    color: #0a84ff;
    background: rgba(10, 132, 255, 0.1);
  }

  .eye-care-title-badge svg {
    width: 1.1rem;
    height: 1.1rem;
  }

  .eye-care-save {
    min-width: 6.5rem;
    padding-inline: 1rem;
    border-radius: var(--radius-md);
  }

  .eye-care-save:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .eye-care-loading {
    display: grid;
    min-height: 16rem;
    place-items: center;
  }

  .eye-care-board {
    display: grid;
    gap: 1rem;
  }

  .eye-care-hero,
  .eye-care-diagnostics,
  .eye-care-events {
    border-radius: var(--radius-lg);
    background: var(--editorial-surface-featured);
  }

  .eye-care-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 12rem;
    gap: 2rem;
    align-items: center;
    padding: 1.75rem;
  }

  .eye-care-live-state,
  .eye-care-reason-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    width: fit-content;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 650;
  }

  .eye-care-live-state {
    margin-bottom: 1rem;
    color: #6e6e73;
  }

  .eye-care-live-dot,
  .eye-care-reason-chip span,
  .eye-care-event-marker {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: #86868b;
  }

  .counting .eye-care-live-dot,
  .eye-care-reason-chip.counting span,
  .eye-care-event-marker.counting {
    background: #34c759;
  }

  .resting .eye-care-live-dot,
  .eye-care-reason-chip.resting span,
  .eye-care-event-marker.resting {
    background: #0a84ff;
  }

  .warning .eye-care-live-dot,
  .eye-care-reason-chip.warning span,
  .eye-care-event-marker.warning {
    background: #ff9f0a;
  }

  .paused .eye-care-live-dot,
  .eye-care-reason-chip.paused span,
  .eye-care-event-marker.paused {
    background: #86868b;
  }

  .eye-care-eyebrow {
    margin: 0;
    color: #6e6e73;
    font-size: 0.75rem;
    font-weight: 650;
  }

  :global(.dark) .eye-care-eyebrow,
  :global(.dark) .eye-care-live-state {
    color: #98989d;
  }

  .eye-care-time {
    margin-top: 0.15rem;
    color: #1d1d1f;
    font-size: clamp(2.75rem, 6vw, 4.75rem);
    font-weight: 650;
    letter-spacing: -0.05em;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
  }

  :global(.dark) .eye-care-time {
    color: #f5f5f7;
  }

  .eye-care-remaining-row {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin-top: 1rem;
    color: #6e6e73;
    font-size: 0.875rem;
  }

  .eye-care-remaining-row strong {
    color: #1d1d1f;
    font-size: 1.125rem;
    font-variant-numeric: tabular-nums;
  }

  :global(.dark) .eye-care-remaining-row {
    color: #98989d;
  }

  :global(.dark) .eye-care-remaining-row strong {
    color: #f5f5f7;
  }

  .eye-care-meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 11rem));
    gap: 0.75rem;
    margin-top: 1.25rem;
  }

  .eye-care-meta-grid > div {
    display: grid;
    gap: 0.15rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--surface-border-subtle);
  }

  .eye-care-meta-grid span,
  .eye-care-signal-item span,
  .eye-care-event-copy span,
  .eye-care-event-row time {
    color: #86868b;
    font-size: 0.75rem;
  }

  .eye-care-meta-grid strong,
  .eye-care-signal-item strong,
  .eye-care-breakdown-list strong {
    color: #1d1d1f;
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
  }

  :global(.dark) .eye-care-meta-grid strong,
  :global(.dark) .eye-care-signal-item strong,
  :global(.dark) .eye-care-breakdown-list strong {
    color: #f5f5f7;
  }

  .eye-care-progress {
    position: relative;
    width: 11rem;
    height: 11rem;
  }

  .eye-care-progress svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .eye-care-progress circle {
    fill: none;
    stroke-width: 7;
  }

  .eye-care-progress-track {
    stroke: var(--editorial-surface-subtle);
  }

  .eye-care-progress-value {
    stroke: #0a84ff;
    stroke-linecap: round;
    transition: stroke-dashoffset 400ms ease;
  }

  .eye-care-progress-label {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    text-align: center;
  }

  .eye-care-progress-label strong {
    color: #1d1d1f;
    font-size: 1.75rem;
    font-variant-numeric: tabular-nums;
  }

  .eye-care-progress-label span {
    color: #86868b;
    font-size: 0.75rem;
  }

  :global(.dark) .eye-care-progress-label strong {
    color: #f5f5f7;
  }

  .eye-care-diagnostics,
  .eye-care-events {
    padding: 1.5rem;
  }

  .eye-care-section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .eye-care-section-heading h3 {
    margin: 0;
    color: #1d1d1f;
    font-size: 0.9375rem;
    font-weight: 650;
  }

  :global(.dark) .eye-care-section-heading h3 {
    color: #f5f5f7;
  }

  .eye-care-section-heading p {
    max-width: 44rem;
    margin: 0.25rem 0 0;
    color: #86868b;
    font-size: 0.8125rem;
  }

  .eye-care-reason-chip {
    flex: 0 0 auto;
    padding: 0.45rem 0.75rem;
    background: var(--editorial-surface-subtle);
    color: #6e6e73;
  }

  :global(.dark) .eye-care-reason-chip {
    color: #98989d;
  }

  .eye-care-signal-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    margin-top: 1.25rem;
    border-top: 1px solid var(--surface-border-subtle);
    border-bottom: 1px solid var(--surface-border-subtle);
  }

  .eye-care-signal-item {
    display: grid;
    gap: 0.2rem;
    padding: 1rem;
  }

  .eye-care-signal-item + .eye-care-signal-item {
    border-inline-start: 1px solid var(--surface-border-subtle);
  }

  .eye-care-breakdown {
    margin-top: 1.25rem;
  }

  .eye-care-breakdown > p {
    margin: 0 0 0.65rem;
    color: #6e6e73;
    font-size: 0.75rem;
    font-weight: 650;
  }

  :global(.dark) .eye-care-breakdown > p {
    color: #98989d;
  }

  .eye-care-breakdown-list {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .eye-care-breakdown-list > div {
    display: grid;
    gap: 0.15rem;
    padding: 0.75rem;
    border-radius: var(--radius-md);
    background: var(--editorial-surface-subtle);
  }

  .eye-care-breakdown-list span {
    color: #86868b;
    font-size: 0.75rem;
  }

  .eye-care-event-list {
    margin-top: 1rem;
  }

  .eye-care-event-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    min-height: 3.25rem;
    border-top: 1px solid var(--surface-border-subtle);
  }

  .eye-care-event-copy {
    display: grid;
    min-width: 0;
  }

  .eye-care-event-copy strong {
    overflow: hidden;
    color: #1d1d1f;
    font-size: 0.8125rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.dark) .eye-care-event-copy strong {
    color: #f5f5f7;
  }

  .eye-care-event-row time {
    font-variant-numeric: tabular-nums;
  }

  .eye-care-empty {
    margin: 1rem 0 0;
    padding-top: 1rem;
    border-top: 1px solid var(--surface-border-subtle);
    color: #86868b;
    font-size: 0.8125rem;
  }

  .eye-care-settings :global(.settings-card) {
    margin: 0;
  }

  @media (max-width: 960px) {
    .eye-care-signal-grid,
    .eye-care-breakdown-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .eye-care-signal-item + .eye-care-signal-item {
      border-inline-start: none;
    }

    .eye-care-signal-item:nth-child(even) {
      border-inline-start: 1px solid var(--surface-border-subtle);
    }
  }

  @media (max-width: 720px) {
    .eye-care-hero {
      grid-template-columns: 1fr;
    }

    .eye-care-progress {
      grid-row: 1;
      width: 8rem;
      height: 8rem;
    }

    .eye-care-section-heading {
      flex-direction: column;
    }

    .eye-care-signal-grid,
    .eye-care-breakdown-list,
    .eye-care-meta-grid {
      grid-template-columns: 1fr;
    }

    .eye-care-signal-item:nth-child(even) {
      border-inline-start: none;
    }
  }

  /* 已确认的紧凑浅色方案：状态、依据、事件和设置在首屏形成完整阅读顺序。 */
  .eye-care-dashboard {
    color-scheme: light;
  }

  .eye-care-dashboard .page-header {
    min-height: 2.5rem;
    align-items: center;
    margin-bottom: 0.8rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--surface-border-subtle);
  }

  .eye-care-title-badge {
    width: 1.95rem;
    height: 1.95rem;
    border-radius: 0.5rem;
  }

  .eye-care-title-badge svg {
    width: 1rem;
    height: 1rem;
  }

  .eye-care-dashboard .page-title-copy h2 {
    font-size: 1.25rem;
  }

  .eye-care-dashboard .page-title-copy p {
    margin-top: 0.2rem;
    font-size: 0.6875rem;
    line-height: 1.35;
  }

  .eye-care-save-dock {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
  }

  .eye-care-save-status {
    min-width: 4.75rem;
    color: #94a3b8;
    font-size: 0.6875rem;
    text-align: end;
  }

  .eye-care-save-status-dirty {
    color: #b5691c;
  }

  .eye-care-save {
    min-width: 0;
    min-height: 2.2rem;
    padding-inline: 0.8rem;
    border: 1px solid #2f78e8;
    border-radius: 0.5rem;
  }

  .eye-care-save:disabled {
    border-color: var(--surface-border-subtle);
    background: #ffffff;
    color: #81909c;
    opacity: 1;
  }

  .eye-care-board {
    gap: 0.75rem;
  }

  .eye-care-hero,
  .eye-care-diagnostics,
  .eye-care-events,
  .eye-care-settings :global(.eye-care-config-card) {
    border: 1px solid var(--surface-border-subtle);
    border-radius: 0.55rem;
    background: #ffffff;
    box-shadow: none;
  }

  .eye-care-hero {
    min-height: 12.625rem;
    grid-template-columns: minmax(0, 1fr) 8.625rem;
    gap: 1.5rem;
    padding: 1.125rem 1.375rem;
  }

  .eye-care-live-state {
    margin-bottom: 0;
    font-size: 0.6875rem;
  }

  .eye-care-live-dot {
    width: 0.4375rem;
    height: 0.4375rem;
  }

  .eye-care-cycle-row {
    display: flex;
    align-items: flex-end;
    gap: 1.25rem;
    margin-top: 0.75rem;
  }

  .eye-care-eyebrow {
    font-size: 0.625rem;
  }

  .eye-care-time {
    margin-top: 0.125rem;
    font-size: 2.375rem;
    letter-spacing: -0.025em;
  }

  .eye-care-remaining-row {
    display: block;
    margin-top: 0;
    padding-bottom: 0.2rem;
    font-size: 0.625rem;
  }

  .eye-care-remaining-row strong {
    display: block;
    margin-top: 0.2rem;
    font-size: 1.0625rem;
  }

  .eye-care-meta-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    margin-top: 1rem;
    border-top: 1px solid var(--surface-border-subtle);
  }

  .eye-care-meta-grid > div {
    gap: 0.15rem;
    padding: 0.625rem 0.75rem 0 0;
    border-top: 0;
  }

  .eye-care-meta-grid > div + div {
    padding-inline-start: 0.75rem;
    border-inline-start: 1px solid var(--surface-border-subtle);
  }

  .eye-care-meta-grid span,
  .eye-care-signal-item span,
  .eye-care-event-copy span,
  .eye-care-event-row time {
    font-size: 0.625rem;
  }

  .eye-care-meta-grid strong,
  .eye-care-signal-item strong,
  .eye-care-breakdown-list strong {
    font-size: 0.6875rem;
  }

  .eye-care-progress {
    width: 7.625rem;
    height: 7.625rem;
  }

  .eye-care-progress-label strong {
    font-size: 1.375rem;
  }

  .eye-care-progress-label span {
    margin-top: 0.125rem;
    font-size: 0.625rem;
  }

  .eye-care-middle-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(19.375rem, 0.8fr);
    gap: 0.75rem;
  }

  .eye-care-diagnostics,
  .eye-care-events {
    padding: 0;
    overflow: hidden;
  }

  .eye-care-section-heading {
    min-height: 3rem;
    align-items: center;
    padding: 0.5rem 0.8rem;
    border-bottom: 1px solid var(--surface-border-subtle);
    background: #fbfcfd;
  }

  .eye-care-section-heading h3 {
    font-size: 0.75rem;
  }

  .eye-care-section-heading p {
    margin-top: 0.15rem;
    font-size: 0.625rem;
  }

  .eye-care-reason-chip {
    padding: 0.25rem 0.45rem;
    border-radius: 0.4rem;
    font-size: 0.625rem;
  }

  .eye-care-signal-grid {
    margin-top: 0;
    border-top: 0;
    border-bottom: 1px solid var(--surface-border-subtle);
  }

  .eye-care-signal-item {
    padding: 0.625rem 0.75rem;
  }

  .eye-care-breakdown {
    margin-top: 0;
  }

  .eye-care-breakdown > p {
    margin: 0;
    padding: 0.6rem 0.75rem 0.3rem;
    font-size: 0.625rem;
  }

  .eye-care-breakdown-list {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0;
    padding: 0 0.75rem 0.7rem;
  }

  .eye-care-breakdown-list > div {
    gap: 0.15rem;
    padding: 0.35rem 0.55rem;
    border-radius: 0;
    background: transparent;
  }

  .eye-care-breakdown-list > div + div {
    border-inline-start: 1px solid var(--surface-border-subtle);
  }

  .eye-care-breakdown-list span {
    overflow: hidden;
    font-size: 0.625rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .eye-care-event-list {
    margin-top: 0;
    padding-inline: 0.75rem;
  }

  .eye-care-event-row {
    min-height: 2.5625rem;
    gap: 0.5rem;
  }

  .eye-care-event-copy strong {
    font-size: 0.625rem;
  }

  .eye-care-event-marker {
    width: 0.375rem;
    height: 0.375rem;
  }

  .eye-care-settings :global(.eye-care-config-card) {
    padding: 0;
    overflow: hidden;
  }

  .eye-care-settings :global(.eye-care-config-master) {
    min-height: 3.25rem;
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0.55rem 0.8rem;
    border-bottom: 1px solid var(--surface-border-subtle);
  }

  .eye-care-settings :global(.eye-care-config-master-copy) {
    min-width: 0;
    flex: 1;
  }

  .eye-care-settings :global(.settings-card-title) {
    margin: 0;
    color: #263645;
    font-size: 0.6875rem;
    letter-spacing: 0;
    text-transform: none;
  }

  .eye-care-settings :global(.eye-care-config-master-copy .settings-muted) {
    margin-top: 0.15rem;
    font-size: 0.625rem;
  }

  .eye-care-settings :global(.eye-care-config-grid) {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    border-bottom: 1px solid var(--surface-border-subtle);
  }

  .eye-care-settings :global(.eye-care-config-field) {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0.7rem 0.75rem;
  }

  .eye-care-settings :global(.eye-care-config-field + .eye-care-config-field) {
    border-inline-start: 1px solid var(--surface-border-subtle);
  }

  .eye-care-settings :global(.eye-care-config-field .settings-text) {
    font-size: 0.625rem;
  }

  .eye-care-settings :global(.eye-care-config-field .settings-muted) {
    min-height: 2rem;
    margin-top: 0.2rem;
    font-size: 0.625rem;
    line-height: 1.45;
  }

  .eye-care-settings :global(.eye-care-config-field .control-input) {
    min-height: 1.95rem;
    margin-top: 0.45rem;
    padding: 0 0.5rem;
    border-radius: 0.45rem;
    background: #f6f8fa;
    font-size: 0.6875rem;
  }

  .eye-care-settings :global(.eye-care-config-pause-row) {
    min-height: 3.2rem;
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0.5rem 0.8rem;
  }

  .eye-care-settings :global(.eye-care-config-pause-copy) {
    min-width: 0;
    flex: 1;
  }

  .eye-care-settings :global(.eye-care-config-pause-copy .settings-text) {
    font-size: 0.65625rem;
  }

  .eye-care-settings :global(.eye-care-config-pause-copy .settings-muted),
  .eye-care-settings :global(.eye-care-config-estimate) {
    margin-top: 0.15rem;
    font-size: 0.625rem;
  }

  .eye-care-settings :global(.eye-care-config-estimate) {
    max-width: 22rem;
    margin-inline-start: auto;
    text-align: end;
  }

  @media (max-width: 1080px) {
    .eye-care-middle-grid {
      grid-template-columns: 1fr;
    }

    .eye-care-settings :global(.eye-care-config-grid) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .eye-care-settings :global(.eye-care-config-field:nth-child(4)) {
      border-inline-start: 0;
    }
  }

  @media (max-width: 720px) {
    .eye-care-save-status {
      display: none;
    }

    .eye-care-hero {
      grid-template-columns: 1fr;
    }

    .eye-care-progress {
      grid-row: 1;
      width: 6.75rem;
      height: 6.75rem;
    }

    .eye-care-meta-grid,
    .eye-care-settings :global(.eye-care-config-grid) {
      grid-template-columns: 1fr;
    }

    .eye-care-meta-grid > div + div,
    .eye-care-settings :global(.eye-care-config-field + .eye-care-config-field) {
      border-inline-start: 0;
      border-top: 1px solid var(--surface-border-subtle);
    }

    .eye-care-settings :global(.eye-care-config-estimate) {
      display: none;
    }
  }
</style>
