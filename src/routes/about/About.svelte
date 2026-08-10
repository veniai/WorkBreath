<script>
  import { onDestroy, onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-shell';
  import { getVersion } from '@tauri-apps/api/app';
  import { locale, t } from '$lib/i18n/index.js';
  import { runUpdateFlow } from '$lib/utils/updater.js';

  const wechatSponsorshipQr = new URL('../../../docs/sponsorship/vx.png', import.meta.url).href;
  const alipaySponsorshipQr = new URL('../../../docs/sponsorship/zfb.png', import.meta.url).href;
  const bmcQr = new URL('../../../docs/sponsorship/buycoffee.png', import.meta.url).href;

  let appVersion = '';
  let isCheckingUpdate = false;
  let autoCheckUpdate = true;
  let isSponsorshipOpen = false;
  let zoomedQr = null;
  let updateStatus = '';
  let updateStatusTimer = null;
  $: currentLocale = $locale;

  onMount(async () => {
    try {
      const version = await getVersion();
      appVersion = typeof version === 'string' && version.trim() ? version : '--';
    } catch (e) {
      console.error('获取版本失败:', e);
      appVersion = '--';
    }

    try {
      const settings = await invoke('get_update_settings');
      autoCheckUpdate = settings?.autoCheck ?? true;
    } catch (e) {
      console.error('读取更新设置失败:', e);
    }
  });

  async function toggleAutoCheck() {
    autoCheckUpdate = !autoCheckUpdate;
    try {
      const settings = await invoke('get_update_settings');
      settings.autoCheck = autoCheckUpdate;
      await invoke('save_update_settings', { settings });
    } catch (e) {
      console.error('保存更新设置失败:', e);
      autoCheckUpdate = !autoCheckUpdate;
    }
  }

  async function openGitHub() {
    await open('https://github.com/wm94i/Work-Review');
  }

  async function openDataDir() {
    try {
      await invoke('open_data_dir');
    } catch (e) {
      console.error('打开目录失败:', e);
    }
  }

  function openSponsorshipModal() {
    isSponsorshipOpen = true;
  }

  function closeSponsorshipModal() {
    zoomedQr = null;
    isSponsorshipOpen = false;
  }

  async function checkForUpdates() {
    if (isCheckingUpdate) return;

    isCheckingUpdate = true;
    updateStatus = t('about.checkingUpdates');

    await runUpdateFlow({
      onStatusChange: (status) => {
        updateStatus = status;
      },
    });

    isCheckingUpdate = false;
    if (updateStatus) {
      clearTimeout(updateStatusTimer);
      updateStatusTimer = setTimeout(() => {
        updateStatus = '';
        updateStatusTimer = null;
      }, 3000);
    }
  }

  onDestroy(() => {
    clearTimeout(updateStatusTimer);
  });

  function handleWindowKeydown(event) {
    if (event.key !== 'Escape' || !isSponsorshipOpen) return;
    if (zoomedQr) zoomedQr = null;
    else closeSponsorshipModal();
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<div class="page-shell about-editorial-shell" data-locale={currentLocale}>
  <div class="page-header page-axis-operation">
    <div class="page-title-group">
      <div class="page-title-badge">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" stroke-width="1.8" />
          <path stroke-linecap="round" stroke-width="1.8" d="M12 10.5v5" />
          <circle cx="12" cy="7.5" r=".8" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <div class="page-title-copy">
        <h2>{t('about.pageTitle')}</h2>
        <p>{t('about.pageSubtitle')}</p>
      </div>
    </div>
  </div>

  <div class="w-full about-minimal-shell page-axis-reading">
    <section class="page-card about-brand-card about-product-panel">
      <div class="about-product-identity">
        <div class="about-brand-identity">
          <div class="about-brand-mark">
            <img src="/icons/256x256.png" alt="WorkBreath 息刻" />
          </div>

          <div class="about-brand-copy">
            <p class="about-product-kicker">{t('about.productInfo')}</p>
            <div class="about-brand-title-row">
              <h1 class="about-brand-title">WorkBreath <span class="about-brand-cn">息刻</span></h1>
              <span class="about-version-badge">v{appVersion}</span>
            </div>
            <p class="about-brand-tagline">{t('about.brandTagline')}</p>
            <p class="about-brand-description">{t('about.description')}</p>
            <div class="about-local-note">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" stroke-width="1.8" />
                <path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke-width="1.8" />
              </svg>
              <span>{t('about.localFirstCopy')}</span>
            </div>

            <div class="about-action-row">
              <button type="button" on:click={openGitHub} class="page-action-secondary about-action-button">
                <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                <span>GitHub</span>
              </button>
              <button type="button" on:click={openDataDir} class="page-action-secondary about-action-button">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                <span>{t('about.openDataDir')}</span>
              </button>
              <button type="button" on:click={openSponsorshipModal} class="about-support-link about-action-button">
                <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.996 21.357c-.34 0-.673-.092-.966-.267C8.304 19.466 2.25 15.48 2.25 9.806c0-3.034 2.395-5.556 5.47-5.556 1.708 0 3.31.78 4.276 2.074.966-1.293 2.567-2.074 4.275-2.074 3.074 0 5.48 2.522 5.48 5.556 0 5.674-6.054 9.66-8.78 11.284a1.88 1.88 0 0 1-.975.267Z" /></svg>
                <span>{t('about.sponsorship')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="about-update-pane">
        <div class="about-update-heading">
          <h2>{t('about.updateStatus')}</h2>
          <span class:about-update-state-live={Boolean(updateStatus)} class="about-update-state" role="status" aria-live="polite">
            {updateStatus || t('about.updateIdle')}
          </span>
        </div>

        <div class="about-update-grid">
          <div class="about-update-unit">
            <span>{t('about.currentVersionTag')}</span>
            <strong>v{appVersion}</strong>
          </div>

          <div class="about-update-unit">
            <span>{t('about.autoCheckUpdate')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoCheckUpdate}
              aria-label={t('about.autoCheckUpdate')}
              title={t('about.autoCheckUpdate')}
              on:click={toggleAutoCheck}
              class="switch-track {autoCheckUpdate ? 'bg-primary-500' : 'bg-slate-300'}"
            ><span class="switch-thumb {autoCheckUpdate ? 'translate-x-5' : 'translate-x-0'}"></span></button>
          </div>

          <div class="about-update-unit">
            <span>{t('about.checkUpdates')}</span>
            <button type="button" on:click={checkForUpdates} disabled={isCheckingUpdate} class="page-control-btn about-check-button">
              {#if isCheckingUpdate}
                <svg class="animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>{t('about.checkingUpdates')}</span>
              {:else}
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                <span>{t('about.checkUpdates')}</span>
              {/if}
            </button>
          </div>
        </div>

        {#if updateStatus}
          <div class="about-update-feedback" role="status" aria-live="polite">{updateStatus}</div>
        {/if}
      </div>
    </section>

    <section class="page-card about-principles-card">
      <header class="about-section-heading">
        <h2 class="about-principles-title page-section-title">{t('about.productPrinciplesTitle')}</h2>
      </header>
      <div class="about-trust-grid">
        <article class="about-trust-card">
          <span class="about-trust-kicker">01</span>
          <div><h3 class="about-trust-title">{t('about.localFirstTitle')}</h3><p class="about-trust-copy">{t('about.localFirstCopy')}</p></div>
        </article>
        <article class="about-trust-card">
          <span class="about-trust-kicker">02</span>
          <div><h3 class="about-trust-title">{t('about.timelineTrustTitle')}</h3><p class="about-trust-copy">{t('about.timelineTrustCopy')}</p></div>
        </article>
        <article class="about-trust-card">
          <span class="about-trust-kicker">03</span>
          <div><h3 class="about-trust-title">{t('about.reportTrustTitle')}</h3><p class="about-trust-copy">{t('about.reportTrustCopy')}</p></div>
        </article>
      </div>
    </section>

    <section class="page-card about-tech-stack">
      <span class="about-tech-label">{t('about.technology')}</span>
      <div class="about-tech-list"><span class="about-tech-item">Tauri 2</span><span class="about-tech-item">Svelte</span><span class="about-tech-item">Rust</span><span class="about-tech-item">SQLite</span></div>
    </section>
  </div>
</div>

{#if isSponsorshipOpen}
  <div class="about-support-overlay animate-fadeIn">
    <button type="button" class="about-support-backdrop" on:click={closeSponsorshipModal} aria-label={t('about.closeSupportDialog')}></button>

    <div class="about-support-dialog" role="dialog" aria-modal="true" aria-labelledby="sponsorship-dialog-title">
      <header class="about-support-heading">
        <div>
          <p>{t('about.supportBadge')}</p>
          <h3 id="sponsorship-dialog-title">{t('about.supportTitle')}</h3>
          <div class="about-support-description"><span>{t('about.supportCopy')}</span><span>{t('about.supportCopy2')}</span></div>
        </div>
        <button type="button" on:click={closeSponsorshipModal} class="about-support-close" aria-label={t('about.closeSupportDialog')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </header>

      <div class="about-support-methods">
        <article class="about-support-method">
          <div class="about-support-method-name"><span></span><h4>{t('about.wechat')}</h4></div>
          <button type="button" class="about-qr-button" aria-label={t('about.wechatQrAlt')} on:click={() => zoomedQr = wechatSponsorshipQr}>
            <img src={wechatSponsorshipQr} alt={t('about.wechatQrAlt')} />
          </button>
        </article>

        <article class="about-support-method">
          <div class="about-support-method-name"><span></span><h4>{t('about.alipay')}</h4></div>
          <button type="button" class="about-qr-button" aria-label={t('about.alipayQrAlt')} on:click={() => zoomedQr = alipaySponsorshipQr}>
            <img src={alipaySponsorshipQr} alt={t('about.alipayQrAlt')} />
          </button>
        </article>

        <article class="about-support-method">
          <div class="about-support-method-name"><span></span><h4>Buy Me a Coffee</h4></div>
          <button type="button" class="about-qr-button" aria-label="Buy Me a Coffee QR code" on:click={() => zoomedQr = bmcQr}>
            <img src={bmcQr} alt="Buy Me a Coffee QR code" />
          </button>
        </article>
      </div>
    </div>

    {#if zoomedQr}
      <div class="about-qr-zoom animate-fadeIn">
        <button type="button" class="about-support-backdrop" aria-label={t('about.closeSupportDialog')} on:click={() => zoomedQr = null}></button>
        <img src={zoomedQr} alt="" />
      </div>
    {/if}
  </div>
{/if}
