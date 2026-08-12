<script>
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n/index.js';

  export let config;
  const dispatch = createEventDispatcher();

  function clampNumber(field, min, max, fallback) {
    const parsed = Number.parseInt(config[field], 10);
    config[field] = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
    dispatch('change', config);
  }

  function toggle(field) {
    config[field] = !Boolean(config[field]);
    dispatch('change', config);
  }
</script>

<div class="settings-card eye-care-config-card">
  <div class="eye-care-config-master">
    <div class="eye-care-config-master-copy">
      <h3 class="settings-card-title">{t('eyeCare.title')}</h3>
      <p class="settings-muted mt-1">{t('eyeCare.description')}</p>
    </div>
    <button
      type="button"
      class="switch-track {config.eye_care_enabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-[rgba(255,255,255,0.14)]'}"
      role="switch"
      aria-checked={config.eye_care_enabled}
      aria-label={t('eyeCare.enabled')}
      on:click={() => toggle('eye_care_enabled')}
    ><span class="switch-thumb {config.eye_care_enabled ? 'translate-x-5' : 'translate-x-0'}"></span></button>
  </div>

  <div class="eye-care-config-grid">
    <label class="settings-block eye-care-config-field">
      <span class="settings-text">{t('eyeCare.workMinutes')}</span>
      <span class="settings-muted mt-1">{t('eyeCare.workMinutesHint')}</span>
      <input class="control-input" type="number" min="1" max="240" bind:value={config.eye_care_work_minutes} on:change={() => clampNumber('eye_care_work_minutes', 1, 240, 40)} />
    </label>
    <label class="settings-block eye-care-config-field">
      <span class="settings-text">{t('eyeCare.restMinutes')}</span>
      <span class="settings-muted mt-1">{t('eyeCare.restMinutesHint')}</span>
      <input class="control-input" type="number" min="1" max="30" bind:value={config.eye_care_rest_minutes} on:change={() => clampNumber('eye_care_rest_minutes', 1, 30, 3)} />
    </label>
    <label class="settings-block eye-care-config-field">
      <span class="settings-text">{t('eyeCare.inputGraceSeconds')}</span>
      <span class="settings-muted mt-1">{t('eyeCare.inputGraceSecondsHint')}</span>
      <input class="control-input" type="number" min="5" max="300" bind:value={config.eye_care_input_grace_seconds} on:change={() => clampNumber('eye_care_input_grace_seconds', 5, 300, 60)} />
    </label>
    <label class="settings-block eye-care-config-field">
      <span class="settings-text">{t('eyeCare.naturalRestMinutes')}</span>
      <span class="settings-muted mt-1">{t('eyeCare.naturalRestMinutesHint')}</span>
      <input class="control-input" type="number" min="1" max="60" bind:value={config.eye_care_natural_rest_minutes} on:change={() => clampNumber('eye_care_natural_rest_minutes', 1, 60, 5)} />
    </label>
    <label class="settings-block eye-care-config-field">
      <span class="settings-text">{t('eyeCare.preBreakSeconds')}</span>
      <span class="settings-muted mt-1">{t('eyeCare.preBreakSecondsHint')}</span>
      <input class="control-input" type="number" min="5" max="300" bind:value={config.eye_care_pre_break_seconds} on:change={() => clampNumber('eye_care_pre_break_seconds', 5, 300, 30)} />
    </label>
  </div>

  <div class="eye-care-config-lock-row">
    <div class="eye-care-config-lock-copy">
      <div class="settings-text">{t('eyeCare.lockOnRestEnd')}</div>
      <div class="settings-muted mt-1">{t('eyeCare.lockOnRestEndHint')}</div>
    </div>
    <button
      type="button"
      class="switch-track {config.eye_care_lock_on_rest_end ? 'bg-brand-500' : 'bg-slate-300 dark:bg-[rgba(255,255,255,0.14)]'}"
      role="switch"
      aria-checked={config.eye_care_lock_on_rest_end}
      aria-label={t('eyeCare.lockOnRestEnd')}
      disabled={!config.eye_care_enabled}
      on:click={() => toggle('eye_care_lock_on_rest_end')}
    ><span class="switch-thumb {config.eye_care_lock_on_rest_end ? 'translate-x-5' : 'translate-x-0'}"></span></button>
  </div>

  <div class="eye-care-config-pause-row">
    <div class="eye-care-config-pause-copy">
      <div class="settings-text">{t('eyeCare.pause')}</div>
      <div class="settings-muted mt-1">{t('eyeCare.pauseHint')}</div>
    </div>
    <p class="settings-muted eye-care-config-estimate">{t('eyeCare.estimateNotice')}</p>
    <button
      type="button"
      class="switch-track {config.eye_care_paused ? 'bg-brand-500' : 'bg-slate-300 dark:bg-[rgba(255,255,255,0.14)]'}"
      role="switch"
      aria-checked={config.eye_care_paused}
      aria-label={t('eyeCare.pause')}
      disabled={!config.eye_care_enabled}
      on:click={() => toggle('eye_care_paused')}
    ><span class="switch-thumb {config.eye_care_paused ? 'translate-x-5' : 'translate-x-0'}"></span></button>
  </div>
</div>
