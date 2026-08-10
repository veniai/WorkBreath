<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { initializeLocale, t } from '$lib/i18n/index.js';

  let status = {
    phase: 'RESTING',
    remainingSeconds: 0,
    progress: 0,
  };
  let emergencyTimer = null;
  const EMERGENCY_HOLD_MS = 5000;

  $: minutes = Math.floor((status?.remainingSeconds || 0) / 60);
  $: seconds = (status?.remainingSeconds || 0) % 60;
  $: countdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  $: progress = Math.max(0, Math.min(1, Number(status?.progress) || 0));

  function isEmergencyChord(event) {
    return event.ctrlKey && event.altKey && event.shiftKey && event.code === 'F12';
  }

  function cancelEmergencyHold() {
    if (emergencyTimer) clearTimeout(emergencyTimer);
    emergencyTimer = null;
  }

  function handleKeyDown(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!isEmergencyChord(event) || emergencyTimer || event.repeat) return;
    emergencyTimer = setTimeout(async () => {
      emergencyTimer = null;
      try {
        await invoke('eye_care_emergency_release');
      } catch (error) {
        console.error('护眼故障出口调用失败:', error);
      }
    }, EMERGENCY_HOLD_MS);
  }

  function handleKeyUp(event) {
    event.preventDefault();
    event.stopPropagation();
    if (['F12', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
      cancelEmergencyHold();
    }
  }

  onMount(() => {
    initializeLocale();
    let disposed = false;
    let unlisten = () => {};
    invoke('get_eye_care_status').then((next) => {
      if (!disposed && next) status = next;
    }).catch(() => {});
    listen('eye-care-status-changed', (event) => {
      if (!disposed && event.payload) status = event.payload;
    }).then((cleanup) => {
      if (disposed) cleanup(); else unlisten = cleanup;
    }).catch(() => {});

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', cancelEmergencyHold);
    return () => {
      disposed = true;
      unlisten();
      cancelEmergencyHold();
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', cancelEmergencyHold);
    };
  });
</script>

<svelte:window on:contextmenu|preventDefault />

<div class="rest-screen" role="dialog" aria-modal="true" aria-label={t('eyeCare.overlayDialogLabel')}>
  <div class="glow" aria-hidden="true"></div>
  <main class="stage">
    <div class="eyebrow">WORKBREATH · 息刻</div>
    <h1>{t('eyeCare.overlayTitle')}</h1>
    <p class="sub">{t('eyeCare.overlayDescription')}</p>
    <div class="countdown" aria-live="polite">{countdown}</div>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)} aria-label={t('eyeCare.overlayProgressLabel')}>
      <span style={`width: ${progress * 100}%`}></span>
    </div>
    <div class="hint">{t('eyeCare.overlayHint')}</div>
  </main>
</div>

<style>
  :global(html), :global(body), :global(#app) { margin: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }

  .rest-screen {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: grid;
    place-items: center;
    background: radial-gradient(120% 100% at 50% 0%, #0d1526 0%, #060a14 45%, #000000 100%);
    color: #f5f5f7;
    user-select: none;
    cursor: default;
    font-family: "SF Pro Display", "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* 唯一动效：24s 缓慢呼吸的冷色光晕 */
  .glow {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(42% 30% at 50% 38%, rgba(56, 132, 255, 0.10), transparent 70%);
    animation: rest-breathe 24s ease-in-out infinite;
  }

  @keyframes rest-breathe {
    0%, 100% { opacity: 0.55; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.12); }
  }

  .stage {
    position: relative;
    text-align: center;
    padding: 0 6vw;
    max-width: 100%;
  }

  .eyebrow {
    font-size: clamp(11px, 1vw, 14px);
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #6e6e73;
    margin-bottom: clamp(16px, 3vh, 32px);
  }

  h1 {
    margin: 0 0 clamp(6px, 1.2vh, 12px);
    font-size: clamp(26px, 3vw, 40px);
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }

  .sub {
    margin: 0 0 clamp(32px, 7vh, 72px);
    font-size: clamp(14px, 1.4vw, 19px);
    color: #98989d;
  }

  .countdown {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    font-size: clamp(84px, 12vw, 168px);
    line-height: 1;
    letter-spacing: -0.04em;
    background: linear-gradient(180deg, #e8f2ff 0%, #7dd3fc 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: clamp(28px, 6vh, 64px);
  }

  .progress {
    width: min(420px, 60vw);
    height: 6px;
    margin: 0 auto clamp(20px, 4vh, 44px);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.10);
    overflow: hidden;
  }

  .progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #0a84ff, #64d2ff);
    transition: width 0.35s linear;
  }

  .hint {
    font-size: clamp(11px, 1vw, 14px);
    color: #6e6e73;
    letter-spacing: 0.02em;
  }
</style>
